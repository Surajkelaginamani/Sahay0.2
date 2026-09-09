import User from '../models/User.js';
import Patient from '../models/Patient.js';
import Consultation from '../models/Consultation.js';
import Prescription from '../models/Prescription.js';
import LabOrder from '../models/LabOrder.js';
import Appointment from '../models/Appointment.js';
import generateToken from '../utils/generateToken.js';

// @desc    Register a new patient (Self-Registration - Prompt 12.1 & 13.2)
// @route   POST /api/patients/register
// @access  Public
export const registerPatient = async (req, res) => {
  let createdUser = null;
  try {
    const {
      // New shared-form fields (Prompt 13.1 / 13.2)
      firstName: rawFirst, lastName: rawLast,
      // Legacy field (backward compat)
      name,
      email, phone, contactPhone, password,
      dob, gender, bloodGroup, address, abhaId,
      isSelfRegister,
    } = req.body;

    // ── Derive first/last name (supports both old "name" and new "firstName/lastName") ──
    let firstName, lastName;
    if (rawFirst) {
      firstName = rawFirst.trim();
      lastName  = (rawLast || '').trim() || 'Citizen';
    } else if (name) {
      const nameParts = name.trim().split(/\s+/);
      firstName = nameParts[0] || 'Patient';
      lastName  = nameParts.slice(1).join(' ') || 'Citizen';
    } else {
      return res.status(400).json({
        message: 'Please provide firstName/lastName or name.',
      });
    }

    const fullName = `${firstName} ${lastName}`;
    const cleanPhone = (phone || contactPhone || '').trim();

    if (!cleanPhone && !email) {
      return res.status(400).json({
        message: 'Please provide at least an email or phone number.',
      });
    }

    const cleanEmail = email && email.trim()
      ? email.trim().toLowerCase()
      : (cleanPhone ? `${cleanPhone}@patient.sahay.gov.in` : undefined);

    // Step 1 (Auth): If isSelfRegister is false, use default password 'Sahay@123' (Prompt 13.2)
    const resolvedPassword = (isSelfRegister === false || !password)
      ? (password && typeof password === 'string' && password.trim().length >= 6
          ? password.trim()
          : 'Sahay@123')
      : (typeof password === 'string' ? password.trim() : password);

    if (resolvedPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    // Check for existing User by email or phone
    const userOrQuery = [];
    if (cleanEmail) userOrQuery.push({ email: cleanEmail });
    if (cleanPhone) userOrQuery.push({ phone: cleanPhone });

    if (userOrQuery.length > 0) {
      const userExists = await User.findOne({ $or: userOrQuery });
      if (userExists) {
        return res.status(400).json({ message: 'User with this email or phone already exists' });
      }
    }

    // Check for existing Patient by phone
    if (cleanPhone) {
      const patientExists = await Patient.findOne({ contactPhone: cleanPhone });
      if (patientExists) {
        return res.status(400).json({
          message: `A patient with phone ${cleanPhone} is already registered.`,
          existingPatient: {
            _id: patientExists._id,
            fullName: `${patientExists.firstName} ${patientExists.lastName}`,
            contactPhone: patientExists.contactPhone,
          },
        });
      }
    }

    // Step 1 (Auth): Create User document (Prompt 13.2)
    createdUser = await User.create({
      name: fullName,
      email: cleanEmail,
      phone: cleanPhone || undefined,
      password: resolvedPassword, // hashed by pre-save hook
      role: 'Patient',
    });

    // Step 2 (Profile): Create Patient document with full form data (Prompt 13.2)
    const patient = await Patient.create({
      firstName,
      lastName,
      dob: dob ? new Date(dob) : new Date('2000-01-01'),
      gender: gender && ['Male', 'Female', 'Other'].includes(gender) ? gender : 'Other',
      contactPhone: cleanPhone || undefined,
      bloodGroup: bloodGroup || undefined,
      address: address || {},
      abhaId: abhaId?.trim() || undefined,
      userId: createdUser._id,
    });

    // Step 3 (Two-way Link): Update User with patientProfileId (Prompt 13.2)
    createdUser.patientProfileId = patient._id;
    await createdUser.save();

    res.status(201).json({
      success: true,
      message: 'Patient registered successfully',
      _id: createdUser._id,
      name: createdUser.name,
      email: createdUser.email,
      phone: createdUser.phone,
      role: createdUser.role,
      token: generateToken(createdUser._id, createdUser.role),
      patientId: patient._id,
      patientProfileId: patient._id,
      patient,
    });
  } catch (error) {
    if (createdUser) {
      await User.findByIdAndDelete(createdUser._id).catch(() => null);
    }

    // Handle Mongoose duplicate key
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0] || 'field';
      return res.status(400).json({
        message: `A patient with this ${field} already exists.`,
      });
    }

    res.status(500).json({ message: error.message });
  }
};

// @desc    Authenticate patient & get token (Prompt 12.2)
// @route   POST /api/patients/login
// @access  Public
export const loginPatient = async (req, res) => {
  try {
    const { email, phone, contactPhone, identifier, password } = req.body;

    const rawId = (phone || contactPhone || email || identifier || '').trim();
    if (!rawId || !password) {
      return res.status(400).json({ message: 'Please provide your phone number or email, and password' });
    }

    const cleanPassword = typeof password === 'string' ? password.trim() : password;

    // Build query to find User by phone, contactPhone, or email
    const idQueries = [
      { email: rawId.toLowerCase(), role: 'Patient' },
      { phone: rawId, role: 'Patient' },
    ];

    if (!rawId.includes('@')) {
      idQueries.push({ phone: rawId.replace(/\D/g, ''), role: 'Patient' });
    }

    let user = await User.findOne({ $or: idQueries });

    // Fallback: If not found in User directly, check if a Patient document exists with this contactPhone
    if (!user && !rawId.includes('@')) {
      const patientByPhone = await Patient.findOne({ contactPhone: rawId });
      if (patientByPhone && patientByPhone.userId) {
        user = await User.findOne({ _id: patientByPhone.userId, role: 'Patient' });
      }
    }

    if (!user) {
      return res.status(401).json({ message: 'Invalid patient credentials (phone/email or password)' });
    }

    let isMatch = await user.matchPassword(cleanPassword);
    if (!isMatch && cleanPassword !== password) {
      isMatch = await user.matchPassword(password);
    }

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid patient credentials (phone/email or password)' });
    }

    // Find linked Patient document (Prompt 12.2: return both User token AND linked Patient._id)
    let patient = null;
    if (user.patientProfileId) {
      patient = await Patient.findById(user.patientProfileId);
    }

    if (!patient) {
      patient = await Patient.findOne({
        $or: [
          { userId: user._id },
          ...(user.phone ? [{ contactPhone: user.phone }] : []),
          ...(!rawId.includes('@') ? [{ contactPhone: rawId }] : []),
        ],
      });

      // Synchronize two-way binding if found
      if (patient) {
        if (!user.patientProfileId) {
          user.patientProfileId = patient._id;
          await user.save();
        }
        if (!patient.userId) {
          patient.userId = user._id;
          await patient.save();
        }
      }
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone || patient?.contactPhone,
      role: user.role,
      token: generateToken(user._id, user.role),
      patientId: patient?._id || null,
      patientProfileId: patient?._id || null,
      patient: patient || null,
    });
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

    // 2. Fetch Prescriptions (Prompt 14.1 — populate hospital & doctor names)
    const prescriptions = await Prescription.find({
      patientId: { $in: candidateIds },
    })
      .populate('facilityId', 'name hospitalName address')
      .populate('hospital', 'name hospitalName address')
      .populate('doctorId', 'name firstName lastName specialization')
      .populate('dispensedBy', 'name')
      .sort({ createdAt: -1 })
      .lean();

    // 3. Fetch Lab Orders (Prompt 14.1 — populate hospital & doctor names)
    const labOrders = await LabOrder.find({
      $or: [
        { patientId: { $in: candidateIds } },
        { patient: { $in: candidateIds } },
      ],
    })
      .populate('facilityId', 'name hospitalName address')
      .populate('doctorId', 'name firstName lastName specialization')
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

