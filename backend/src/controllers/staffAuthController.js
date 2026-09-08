import Hospital from '../models/Hospital.js';
import User from '../models/User.js';
import generateToken from '../utils/generateToken.js';

// Roles that are considered "hospital staff" and require a verified hospital
const HOSPITAL_STAFF_ROLES = [
  'HospitalAdmin',
  'Doctor',
  'ASHA',
  'AshaWorker',
  'LabHead',
  'Pharmacist',
  'FacilityAdmin',
  'Receptionist',
  'Nurse',
];

// @desc    Unified login for all hospital staff roles
// @route   POST /api/auth/staff-login
// @access  Public
export const staffLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: 'Please provide both email and password.' });
    }

    const cleanEmail = email ? email.trim().toLowerCase() : '';
    const cleanPassword = typeof password === 'string' ? password.trim() : password;
    console.log(`[Staff Login] Attempt for email: "${cleanEmail}"`);

    // --- Step 1: Find user by email (any role) ---
    const user = await User.findOne({ email: cleanEmail });

    if (!user) {
      console.log(`[Staff Login] No user found for email: "${cleanEmail}"`);
      return res.status(401).json({
        message: 'Invalid credentials: no account found with this email.',
      });
    }

    // --- Step 2: Verify password ---
    let isMatch = await user.matchPassword(cleanPassword);
    if (!isMatch && cleanPassword !== password) {
      isMatch = await user.matchPassword(password);
    }

    if (!isMatch) {
      console.log(`[Staff Login] Password mismatch for user: "${user.email}"`);
      return res.status(401).json({
        message: 'Invalid credentials: incorrect password.',
      });
    }

    // --- Step 3: Ensure this user belongs to a hospital staff role ---
    if (!HOSPITAL_STAFF_ROLES.includes(user.role)) {
      return res.status(403).json({
        message: `Access denied: the role '${user.role}' cannot use this staff login endpoint.`,
      });
    }

    // --- Step 4: Verify the user has an associated hospital ---
    if (!user.hospitalId) {
      return res.status(403).json({
        message:
          'Access denied: your account is not linked to any hospital. Please contact your administrator.',
      });
    }

    // --- Step 5: Fetch the hospital and check its verification status ---
    const hospital = await Hospital.findById(user.hospitalId);

    if (!hospital) {
      return res.status(404).json({
        message:
          'Associated hospital record not found. Please contact the system administrator.',
      });
    }

    const vStatus = (hospital.verificationStatus || '').toLowerCase();

    if (vStatus === 'pending') {
      return res.status(403).json({
        message:
          'Access denied: your hospital is currently pending government verification. Please try again once approved.',
        verificationStatus: 'pending',
      });
    }

    if (vStatus === 'rejected') {
      return res.status(403).json({
        message:
          'Access denied: your hospital registration has been rejected by government authorities. Please contact support.',
        verificationStatus: 'rejected',
      });
    }

    // --- Step 6: Verification approved — issue JWT with id, role, hospitalId ---
    console.log(
      `[Staff Login] SUCCESS — user: "${user.email}", role: "${user.role}", hospital: "${hospital.hospitalName}"`
    );

    const token = generateToken(user._id, user.role, user.hospitalId);

    return res.status(200).json({
      message: 'Login successful.',
      token,
      role: user.role,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        hospitalId: user.hospitalId,
        hospitalName: hospital.hospitalName,
      },
    });
  } catch (error) {
    console.error('[Staff Login] Unexpected error:', error);
    return res.status(500).json({ message: error.message });
  }
};
