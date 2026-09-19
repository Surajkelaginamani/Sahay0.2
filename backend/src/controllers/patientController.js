import crypto from 'crypto';
import bcrypt from 'bcrypt';
import User from '../models/User.js';
import Patient from '../models/Patient.js';
import SyncConflict from '../models/SyncConflict.js';
import Consultation from '../models/Consultation.js';
import Prescription from '../models/Prescription.js';
import LabOrder from '../models/LabOrder.js';
import Appointment from '../models/Appointment.js';
import FollowUp from '../models/FollowUp.js';
import generateToken from '../utils/generateToken.js';

// @desc    Register a new patient (Self-Registration - Prompt 12.1 & 13.2 & 7.1)
// @route   POST /api/patients/register & POST /api/auth/patient/register
// @access  Public
export const registerPatient = async (req, res) => {
  let createdUser = null;
  try {
    const {
      // New shared-form fields (Prompt 13.1 / 13.2)
      firstName: rawFirst, lastName: rawLast,
      // Legacy field (backward compat)
      name,
      email, phone, contactPhone, password, pin,
      dob, gender, bloodGroup, address, abhaId,
      fatherOrGuardianName: rawGuardian, guardianName, fatherName,
      isSelfRegister,
      forceCreateNew,
      consentProvided, // Prompt 9.1: Digital Consent for ABDM compliance
    } = req.body;

    // ── Prompt 9.1: Mandatory Digital Consent Validation ───────────────────────
    if (consentProvided !== true && consentProvided !== 'true') {
      return res.status(400).json({
        message: 'Patient consent is legally required to create a health record.',
      });
    }

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
      : undefined;

    // ── Static 4-Digit PIN Handling (Prompt 7.1) ──────────────────────────────
    const cleanPin = (pin !== undefined && pin !== null && pin !== '') ? String(pin).trim() : '';

    if (isSelfRegister && !cleanPin) {
      return res.status(400).json({ message: '4-digit static PIN is required' });
    }

    if (cleanPin && !/^\d{4}$/.test(cleanPin)) {
      return res.status(400).json({ message: 'PIN must be exactly 4 numeric digits' });
    }

    const effectivePin = cleanPin || (isSelfRegister ? undefined : '1234');

    // ── Prompt 2.3: Smart Patient Disambiguation Flow ─────────────────────────
    // Before creating the Patient document, query for existing records matching firstName, lastName, and dob.
    if (dob && !forceCreateNew) {
      const dobDate = new Date(dob);
      const dayBefore = new Date(dobDate);
      dayBefore.setDate(dayBefore.getDate() - 1);
      const dayAfter = new Date(dobDate);
      dayAfter.setDate(dayAfter.getDate() + 1);

      const matches = await Patient.find({
        firstName: { $regex: `^${firstName}$`, $options: 'i' },
        lastName:  { $regex: `^${lastName}$`,  $options: 'i' },
        dob:       { $gte: dayBefore, $lte: dayAfter },
      })
        .select('firstName lastName dob gender uhid address contactPhone')
        .lean();

      if (matches.length > 0) {
        return res.status(200).json({
          requiresConfirmation: true,
          message: 'Potential duplicates found',
          matches: matches.map((m) => ({
            _id:          m._id,
            name:         `${m.firstName} ${m.lastName}`.trim(),
            firstName:    m.firstName,
            lastName:     m.lastName,
            dob:          m.dob,
            uhid:         m.uhid || '—',
            gender:       m.gender,
            address:      m.address || {},
            contactPhone: m.contactPhone,
          })),
        });
      }
    }

    // Step 1 (Auth): Password or PIN-derived fallback (Prompt 7.1 & 13.2)
    const resolvedPassword = password && String(password).trim().length >= 4
      ? String(password).trim()
      : (effectivePin ? `Sahay@${effectivePin}` : 'Sahay@123');

    // Check for existing User by email or phone (bypassed if forceCreateNew)
    const userOrQuery = [];
    if (!forceCreateNew && cleanEmail) userOrQuery.push({ email: cleanEmail });
    if (!forceCreateNew && cleanPhone) userOrQuery.push({ phone: cleanPhone });

    if (userOrQuery.length > 0) {
      const userExists = await User.findOne({ $or: userOrQuery });
      if (userExists) {
        return res.status(400).json({ message: 'User with this email or phone already exists' });
      }
    }

    // Check for exact existing Patient by phone + name (Prompt 1.1)
    if (cleanPhone && !forceCreateNew) {
      const exactDuplicate = await Patient.findOne({
        contactPhone: cleanPhone,
        firstName: { $regex: `^${firstName}$`, $options: 'i' },
        lastName:  { $regex: `^${lastName}$`,  $options: 'i' },
      });
      if (exactDuplicate) {
        return res.status(400).json({
          message: `A patient named ${fullName} with phone ${cleanPhone} is already registered.`,
          existingPatient: {
            _id: exactDuplicate._id,
            fullName: `${exactDuplicate.firstName} ${exactDuplicate.lastName}`,
            contactPhone: exactDuplicate.contactPhone,
            uhid: exactDuplicate.uhid,
          },
        });
      }
    }

    // Step 1 (Auth): Create User document (Prompt 7.1 & 13.2)
    const emailTaken = cleanEmail ? await User.findOne({ email: cleanEmail }) : null;
    createdUser = await User.create({
      name: fullName,
      email: emailTaken ? undefined : cleanEmail,
      phone: cleanPhone || undefined,
      password: resolvedPassword, // hashed by pre-save hook
      pin: effectivePin || undefined, // hashed by pre-save hook (Prompt 7.1)
      role: 'Patient',
    });

    // ── Generate 6-Character Recovery Code for Physical Health Card ─────────
    const rawCode = crypto.randomBytes(3).toString('hex').toUpperCase();
    const recoveryCodeHash = await bcrypt.hash(rawCode, 10);
    const resolvedGuardianName = (rawGuardian || guardianName || fatherName || '').trim() || undefined;

    // Step 2 (Profile): Create Patient document with full form data (Prompt 7.1 & 13.2)
    const patient = await Patient.create({
      firstName,
      lastName,
      dob: dob ? new Date(dob) : new Date('2000-01-01'),
      gender: gender && ['Male', 'Female', 'Other'].includes(gender) ? gender : 'Other',
      contactPhone: cleanPhone || undefined,
      bloodGroup: bloodGroup || undefined,
      address: address || {},
      abhaId: abhaId?.trim() || undefined,
      fatherOrGuardianName: resolvedGuardianName,
      recoveryCodeHash,
      pin: effectivePin || undefined,
      userId: createdUser._id,
      consentProvided: true,
      consentTimestamp: new Date(),
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
      uhid: patient.uhid,
      rawCode,
      recoveryCode: rawCode,
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

// @desc    Authenticate patient via Phone & 4-Digit PIN & get token (Prompt 7.1)
// @route   POST /api/auth/patient/login & POST /api/patients/login
// @access  Public
export const loginPatient = async (req, res) => {
  try {
    const { email, phone, contactPhone, identifier, password, pin } = req.body;

    const rawPhone = (phone || contactPhone || identifier || email || '').trim();
    const rawPin = (pin !== undefined && pin !== null && pin !== '')
      ? String(pin).trim()
      : (password ? String(password).trim() : '');

    // Requirement: Both phone and pin are required
    if (!rawPhone || !rawPin) {
      return res.status(400).json({
        message: 'Please provide both phone number and 4-digit PIN',
      });
    }

    const numericPhone = rawPhone.replace(/\D/g, '');

    // Build query to find User by phone or email
    const idQueries = [
      { phone: rawPhone, role: 'Patient' },
    ];
    if (numericPhone && numericPhone !== rawPhone) {
      idQueries.push({ phone: numericPhone, role: 'Patient' });
    }
    if (rawPhone.includes('@')) {
      idQueries.push({ email: rawPhone.toLowerCase(), role: 'Patient' });
    }

    let user = await User.findOne({ $or: idQueries });

    // Look up Patient by contactPhone or UHID
    let patient = null;
    const patientQueries = [
      { contactPhone: rawPhone },
    ];
    if (numericPhone && numericPhone !== rawPhone) {
      patientQueries.push({ contactPhone: numericPhone });
    }
    if (rawPhone.toUpperCase().startsWith('SAH-')) {
      patientQueries.push({ uhid: rawPhone.toUpperCase().trim() });
    }

    patient = await Patient.findOne({ $or: patientQueries });

    // Fallback: If not found in User directly, resolve via Patient.userId
    if (!user && patient && patient.userId) {
      user = await User.findOne({ _id: patient.userId, role: 'Patient' });
    }

    if (!user && !patient) {
      return res.status(401).json({ message: 'Invalid phone number or PIN' });
    }

    // Compare provided PIN with the database
    let isMatch = false;

    // 1. Check User.pin
    if (user && user.pin) {
      isMatch = await user.matchPin(rawPin);
    }

    // 2. Check Patient.pin
    if (!isMatch && patient && patient.pin) {
      isMatch = await patient.matchPin(rawPin);
    }

    // 3. Check User.password
    if (!isMatch && user && user.matchPassword) {
      isMatch = await user.matchPassword(rawPin);
      if (!isMatch) {
        isMatch = await user.matchPassword(`Sahay@${rawPin}`);
      }
    }

    // 4. Fallback for accounts initialized before PIN: accept default '1234'
    if (!isMatch && !user?.pin && !patient?.pin && rawPin === '1234') {
      isMatch = true;
    }

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid phone number or PIN' });
    }

    // If user document didn't exist yet but patient document did, create User
    if (!user && patient) {
      user = await User.create({
        name: patient.fullName || `${patient.firstName} ${patient.lastName}`,
        phone: patient.contactPhone,
        pin: rawPin,
        password: `Sahay@${rawPin}`,
        role: 'Patient',
        patientProfileId: patient._id,
      });
      patient.userId = user._id;
      await patient.save();
    }

    // Synchronize two-way binding & persist PIN if missing
    if (user && patient) {
      if (!user.patientProfileId) {
        user.patientProfileId = patient._id;
        await user.save();
      }
      if (!patient.userId) {
        patient.userId = user._id;
        await patient.save();
      }
      if (!user.pin) {
        user.pin = rawPin;
        await user.save();
      }
      if (!patient.pin) {
        patient.pin = rawPin;
        await patient.save();
      }
    } else if (user && !patient && user.patientProfileId) {
      patient = await Patient.findById(user.patientProfileId);
    }

    res.json({
      success: true,
      message: 'Patient authenticated successfully',
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone || patient?.contactPhone,
      role: user.role,
      token: generateToken(user._id, user.role),
      patientId: patient?._id || null,
      patientProfileId: patient?._id || null,
      isTemporaryPin: Boolean(patient?.isTemporaryPin || user?.isTemporaryPin),
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
      .populate('appointmentId', 'clinicalTags voiceNoteTranscript')
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
        clinicalTags:
          Array.isArray(c.clinicalTags) && c.clinicalTags.length > 0
            ? c.clinicalTags
            : c.appointmentId?.clinicalTags || [],
        voiceNoteTranscript: c.voiceNoteTranscript || c.appointmentId?.voiceNoteTranscript || '',
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

    // Find today's active OPD appointment for the queue tracker
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayEnd   = new Date(); todayEnd.setHours(23, 59, 59, 999);
    const activeAppointment = appointments.find((a) => {
      const apptDate = new Date(a.appointmentDate || a.createdAt);
      const isToday  = apptDate >= todayStart && apptDate <= todayEnd;
      const isActive = ['Waiting for Doctor', 'Waiting', 'WAITING', 'In Consultation', 'IN_CONSULTATION', 'CheckedIn', 'At Triage', 'Scheduled'].includes(a.status);
      return isToday && isActive;
    }) || null;

    // Fetch scheduled follow-up for patient (Prompt: Closed-Loop Follow-up)
    const scheduledFollowUps = await FollowUp.find({
      patientId: { $in: candidateIds },
      status: { $in: ['SCHEDULED', 'ASHA_REMINDED'] },
    })
      .populate('doctorId', 'name email role')
      .populate('facilityId', 'hospitalName address')
      .sort({ followUpDate: 1 })
      .lean();

    const upcomingFollowUp = scheduledFollowUps[0] || null;

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
      activeAppointment,
      scheduledFollowUps,
      upcomingFollowUp,
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── syncPatient (Prompt 2.1) ─────────────────────────────────────────────────
// @desc    Offline PWA sync from ASHA workers with duplicate detection
// @route   POST /api/patients/sync
// @access  Public (same auth level as /register)
export const syncPatient = async (req, res) => {
  try {
    const {
      firstName: rawFirst, lastName: rawLast,
      dob, contactPhone, phone,
      gender, bloodGroup, address, abhaId,
      email, password, pin,
      // Facility context from ASHA device (optional)
      facilityId,
      consentProvided, // Prompt 9.1: Digital Consent for ABDM compliance
    } = req.body;

    // ── Prompt 9.1: Mandatory Digital Consent Validation ───────────────────────
    if (consentProvided !== true && consentProvided !== 'true') {
      return res.status(400).json({
        message: 'Patient consent is legally required to create a health record.',
      });
    }

    // ── Basic validation ──────────────────────────────────────────────────────
    const firstName  = (rawFirst || '').trim();
    const lastName   = (rawLast  || '').trim();
    const cleanPhone = (contactPhone || phone || '').trim();

    if (!firstName || !dob || !gender) {
      return res.status(400).json({
        message: 'firstName, dob, and gender are required for sync.',
      });
    }

    // ── Static 4-Digit PIN Handling (Prompt 7.1) ──────────────────────────────
    const cleanPin = (pin !== undefined && pin !== null && pin !== '') ? String(pin).trim() : '';
    const effectivePin = cleanPin && /^\d{4}$/.test(cleanPin) ? cleanPin : '1234';

    // ── Duplicate detection ───────────────────────────────────────────────────
    // Strategy: match on (firstName + lastName + dob ±1 day) OR contactPhone
    const dobDate  = new Date(dob);
    const dobStart = new Date(dobDate);
    dobStart.setDate(dobStart.getDate() - 1);
    const dobEnd = new Date(dobDate);
    dobEnd.setDate(dobEnd.getDate() + 1);

    const duplicateQuery = [];

    // Name + DOB match (high-probability)
    if (firstName && lastName) {
      duplicateQuery.push({
        $and: [
          { firstName: { $regex: `^${firstName}$`, $options: 'i' } },
          { lastName:  { $regex: `^${lastName}$`,  $options: 'i' } },
          { dob: { $gte: dobStart, $lte: dobEnd } },
        ],
      });
    }

    // Phone match (high-probability)
    if (cleanPhone) {
      duplicateQuery.push({ contactPhone: cleanPhone });
    }

    const existingPatient = duplicateQuery.length > 0
      ? await Patient.findOne({ $or: duplicateQuery }).lean()
      : null;

    if (existingPatient) {
      // Potential duplicate: save to SyncConflict, DO NOT create patient
      await SyncConflict.create({
        incomingData:            req.body,
        potentialMatchPatientId: existingPatient._id,
        status:                  'Pending',
        facilityId:              facilityId || null,
      });

      return res.status(202).json({
        success: true,
        status:  'conflict',
        message:
          'A potential duplicate record was detected. Your submission is under ' +
          'administrative review. This record has been cleared from your offline ' +
          'queue and will be reviewed by the facility admin.',
        existingPatientId: existingPatient._id,
      });
    }

    // ── No duplicate — proceed with normal registration ───────────────────────
    const fullName     = `${firstName} ${lastName}`;
    const userPassword = (password && String(password).trim().length >= 4)
      ? String(password).trim()
      : `Sahay@${effectivePin}`;
    const cleanEmail = email && email.trim()
      ? email.trim().toLowerCase()
      : cleanPhone ? `${cleanPhone}@patient.sahay.gov.in` : undefined;

    let createdUser = null;
    let user = null;
    if (cleanPhone) {
      user = await User.findOne({
        $or: [{ phone: cleanPhone }, ...(cleanEmail ? [{ email: cleanEmail }] : [])],
      });
    } else if (cleanEmail) {
      user = await User.findOne({ email: cleanEmail });
    }

    if (!user) {
      createdUser = await User.create({
        name:     fullName,
        phone:    cleanPhone || undefined,
        email:    cleanEmail,
        password: userPassword,
        pin:      effectivePin, // Prompt 7.1
        role:     'Patient',
      });
      user = createdUser;
    } else if (!user.pin) {
      user.pin = effectivePin;
      await user.save();
    }

    const patient = await Patient.create({
      firstName,
      lastName,
      dob:                  dobDate,
      gender,
      contactPhone:         cleanPhone  || undefined,
      bloodGroup:           bloodGroup  || undefined,
      address:              address     || {},
      abhaId:               abhaId?.trim() || undefined,
      pin:                  effectivePin, // Prompt 7.1
      userId:               user._id,
      registeredAtFacility: facilityId || null,
      consentProvided:      true,
      consentTimestamp:     new Date(),
    });

    user.patientProfileId = patient._id;
    await user.save();

    return res.status(201).json({
      success:   true,
      status:    'created',
      message:   'Patient synced and registered successfully.',
      patientId: patient._id,
      uhid:      patient.uhid,
      patient,
    });
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0] || 'field';
      return res.status(400).json({ message: `A patient with this ${field} already exists.` });
    }
    res.status(500).json({ message: error.message });
  }
};

// ─── updatePatientAllergies (Prompt 5.1) ──────────────────────────────────────
// @desc    Update or append to patient allergies list
// @route   PATCH /api/patients/:id/allergies
// @access  Private (Doctor, Nurse, Receptionist)
export const updatePatientAllergies = async (req, res) => {
  try {
    const { id } = req.params;
    const { allergies, action = 'replace' } = req.body;

    if (!allergies || !Array.isArray(allergies)) {
      return res.status(400).json({
        message: 'Allergies must be provided as an array of strings.',
      });
    }

    const patient = await Patient.findById(id);
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found.' });
    }

    // Clean, trim and filter non-empty allergy strings
    const cleaned = allergies
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter((item) => item.length > 0);

    if (action === 'append') {
      const existingSet = new Set((patient.allergies || []).map((a) => a.toLowerCase()));
      const combined = [...(patient.allergies || [])];
      cleaned.forEach((a) => {
        if (!existingSet.has(a.toLowerCase())) {
          existingSet.add(a.toLowerCase());
          combined.push(a);
        }
      });
      patient.allergies = combined;
    } else {
      // Replace with unique list preserving case of first occurrence
      const seen = new Set();
      const uniqueCleaned = [];
      cleaned.forEach((a) => {
        const lower = a.toLowerCase();
        if (!seen.has(lower)) {
          seen.add(lower);
          uniqueCleaned.push(a);
        }
      });
      patient.allergies = uniqueCleaned;
    }

    if (typeof patient.consentProvided !== 'boolean') {
      patient.consentProvided = true;
    }

    await patient.save();

    return res.status(200).json({
      success: true,
      message: 'Patient allergies updated successfully.',
      allergies: patient.allergies,
      patient,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

