import User from '../models/User.js';
import Patient from '../models/Patient.js';
import Consultation from '../models/Consultation.js';
import Prescription from '../models/Prescription.js';
import LabOrder from '../models/LabOrder.js';
import Appointment from '../models/Appointment.js';
import generateToken from '../utils/generateToken.js';

// @desc    Register a new patient
// @route   POST /api/patients/register
// @access  Public
export const registerPatient = async (req, res) => {
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
      role: 'Patient',
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

// @desc    Authenticate patient & get token
// @route   POST /api/patients/login
// @access  Public
export const loginPatient = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email, role: 'Patient' });

    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id, user.role),
      });
    } else {
      res.status(401).json({ message: 'Invalid patient email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── getMyMedicalRecords (Prompt 9.3) ─────────────────────────────────────────
// @desc    Fetch longitudinal ABDM medical records for the authenticated citizen
// @route   GET /api/patients/my-records
// @access  Private (Patient / Authenticated Citizen)
export const getMyMedicalRecords = async (req, res) => {
  try {
    const userId = req.user._id;

    // Find linked Patient demographic profile
    const patientDoc = await Patient.findOne({
      $or: [
        { userId },
        { _id: userId },
        { contactPhone: req.user.contactPhone || '___none___' },
      ],
    }).populate('registeredAtFacility', 'hospitalName address contactPhone');

    // Collect candidate patient references
    const candidateIds = [userId];
    if (patientDoc) {
      candidateIds.push(patientDoc._id);
    }

    // 1. Fetch Consultations
    const consultations = await Consultation.find({
      $or: [
        { patientId: { $in: candidateIds } },
        { patient: { $in: candidateIds } },
      ],
    })
      .populate('facilityId', 'hospitalName address contactPhone')
      .populate('doctorId', 'name specialization email')
      .sort({ createdAt: -1 })
      .lean();

    // 2. Fetch Prescriptions
    const prescriptions = await Prescription.find({
      patientId: { $in: candidateIds },
    })
      .populate('facilityId', 'hospitalName address')
      .populate('doctorId', 'name specialization')
      .populate('dispensedBy', 'name')
      .sort({ createdAt: -1 })
      .lean();

    // 3. Fetch Lab Orders
    const labOrders = await LabOrder.find({
      $or: [
        { patientId: { $in: candidateIds } },
        { patient: { $in: candidateIds } },
      ],
    })
      .populate('facilityId', 'hospitalName address')
      .populate('doctorId', 'name specialization')
      .sort({ createdAt: -1 })
      .lean();

    // 4. Fetch Appointments
    const appointments = await Appointment.find({
      patientId: { $in: candidateIds },
    })
      .populate('facilityId', 'hospitalName address contactPhone')
      .populate('assignedDoctorId', 'name specialization')
      .sort({ appointmentDate: -1, createdAt: -1 })
      .lean();

    // Extract unique hospitals visited
    const hospitalMap = new Map();

    const registerHospital = (fac, date) => {
      if (!fac || !fac._id) return;
      const idStr = fac._id.toString();
      if (!hospitalMap.has(idStr)) {
        hospitalMap.set(idStr, {
          _id: fac._id,
          hospitalName: fac.hospitalName || 'Healthcare Center',
          address: fac.address || 'Address on file',
          contactPhone: fac.contactPhone || '',
          firstVisit: date,
          lastVisit: date,
          visitCount: 1,
        });
      } else {
        const item = hospitalMap.get(idStr);
        item.visitCount += 1;
        if (new Date(date) > new Date(item.lastVisit)) {
          item.lastVisit = date;
        }
        if (new Date(date) < new Date(item.firstVisit)) {
          item.firstVisit = date;
        }
      }
    };

    appointments.forEach((a) => registerHospital(a.facilityId, a.appointmentDate || a.createdAt));
    consultations.forEach((c) => registerHospital(c.facilityId || c.hospital, c.createdAt));
    prescriptions.forEach((p) => registerHospital(p.facilityId || p.hospital, p.createdAt));
    labOrders.forEach((l) => registerHospital(l.facilityId || l.hospital, l.createdAt));

    const hospitalsVisited = Array.from(hospitalMap.values());

    // Compile chronological unified timeline
    const timeline = [];

    consultations.forEach((c) => {
      timeline.push({
        id: c._id,
        type: 'CONSULTATION',
        title: c.diagnosis ? `Consultation: ${c.diagnosis}` : 'Doctor OPD Consultation',
        date: c.createdAt,
        facility: c.facilityId || c.hospital,
        doctor: c.doctorId || c.doctor,
        chiefComplaint: c.chiefComplaint || c.chiefComplaints,
        diagnosis: c.diagnosis,
        notes: c.notes || c.clinicalNotes,
        vitals: c.vitals,
        medications: c.medications,
      });
    });

    labOrders.forEach((l) => {
      timeline.push({
        id: l._id,
        type: 'LAB_REPORT',
        title: `Investigation: ${l.testName}`,
        date: l.updatedAt || l.createdAt,
        facility: l.facilityId || l.hospital,
        doctor: l.doctorId,
        testName: l.testName,
        status: l.status,
        result: l.result,
        resultURL: l.resultURL,
        notes: l.notes,
      });
    });

    prescriptions.forEach((p) => {
      timeline.push({
        id: p._id,
        type: 'PRESCRIPTION',
        title: `Digital Prescription (${p.medications?.length || 0} medicines)`,
        date: p.createdAt,
        facility: p.facilityId || p.hospital,
        doctor: p.doctorId,
        status: p.status || 'Pending',
        medications: p.medications,
        instructions: p.instructions,
        dispensedAt: p.dispensedAt,
      });
    });

    // Sort timeline descending by date
    timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    res.status(200).json({
      success: true,
      patient: patientDoc || {
        firstName: req.user.name?.split(' ')[0] || 'Citizen',
        lastName: req.user.name?.split(' ').slice(1).join(' ') || '',
        contactPhone: req.user.email,
        email: req.user.email,
      },
      hospitalsVisited,
      timeline,
      consultations,
      prescriptions,
      labOrders,
      appointments,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

