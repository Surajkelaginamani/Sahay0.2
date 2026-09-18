import Hospital from '../models/Hospital.js';
import User from '../models/User.js';
import Patient from '../models/Patient.js';
import Appointment from '../models/Appointment.js';
import generateToken from '../utils/generateToken.js';

// @desc    Register a Govt Employee (for administrative onboarding / dev setup)
// @route   POST /api/govt/register
// @access  Public
export const registerGovtEmployee = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please provide name, email, and password' });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: 'GovtEmployee',
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id, user.role),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Authenticate Govt Employee & get token
// @route   POST /api/govt/login
// @access  Public
export const loginGovtEmployee = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email, role: 'GovtEmployee' });

    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id, user.role),
      });
    } else {
      res.status(401).json({ message: 'Invalid government employee credentials' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all pending hospitals awaiting government verification
// @route   GET /api/govt/pending-hospitals
// @access  Private (GovtEmployee only)
export const getPendingHospitals = async (req, res) => {
  try {
    const hospitals = await Hospital.find({
      $or: [
        { status: { $regex: /^pending$/i } },
        { verificationStatus: { $regex: /^pending$/i } },
      ],
    }).sort({ createdAt: -1 });

    console.log("Found pending hospitals:", hospitals);
    res.json(hospitals);
  } catch (error) {
    console.error("Error finding pending hospitals:", error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Verify (approve or reject) a hospital registration
// @route   PUT /api/govt/verify-hospital/:id
// @access  Private (GovtEmployee only)
export const verifyHospital = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const normalizedStatus = status ? status.toLowerCase() : '';

    if (!normalizedStatus || !['approved', 'rejected'].includes(normalizedStatus)) {
      return res.status(400).json({
        message: "Invalid status value. Must be either 'approved' or 'rejected'",
      });
    }

    const hospital = await Hospital.findById(id);

    if (!hospital) {
      return res.status(404).json({ message: 'Hospital not found' });
    }

    hospital.verificationStatus = normalizedStatus;
    hospital.status = normalizedStatus;
    await hospital.save();

    res.json({
      message: `Hospital verification status successfully updated to '${normalizedStatus}'`,
      hospital,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// @desc    Aggregate dashboard metrics for regulatory overview
// @route   GET /api/govt/dashboard-metrics
// @access  Private (GovtEmployee only)
export const getDashboardMetrics = async (req, res) => {
  try {
    const [totalPatients, approvedHospitals, pendingHospitals, totalConsultations] =
      await Promise.all([
        Patient.countDocuments(),
        Hospital.countDocuments({ status: 'approved' }),
        Hospital.countDocuments({ status: 'pending' }),
        Appointment.countDocuments({ status: 'COMPLETED' }),
      ]);

    res.json({
      success: true,
      metrics: {
        totalPatients,
        approvedHospitals,
        pendingHospitals,
        totalConsultations,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


// @desc    Get accredited facilities directory
// @route   GET /api/govt/facilities
// @access  Private (GovtEmployee only)
export const getFacilities = async (req, res) => {
  try {
    const { status } = req.query;

    const query =
      !status || status.toUpperCase() === 'ALL'
        ? {}
        : { status: status.toLowerCase() };

    const facilities = await Hospital.find(query)
      .sort({ createdAt: -1 })
      .select(
        'hospitalName registrationNumber address adminEmail status verificationStatus createdAt updatedAt'
      );

    const mapped = facilities.map((f) => ({
      _id: f._id,
      facilityName: f.hospitalName,
      facilityId: f.registrationNumber,
      // Parse district/state from address heuristically (comma-separated last parts)
      district: f.address.split(',').slice(-2, -1)[0]?.trim() || f.address,
      state: f.address.split(',').slice(-1)[0]?.trim() || '',
      contactEmail: f.adminEmail,
      accreditationDate: f.updatedAt,
      status: f.status || f.verificationStatus,
    }));

    res.json({ success: true, facilities: mapped });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
