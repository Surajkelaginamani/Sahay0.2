import Patient from '../../models/Patient.js';
import Appointment from '../../models/Appointment.js';
import User from '../../models/User.js';
import Referral from '../../models/Referral.js';
import SyncConflict from '../../models/SyncConflict.js';
import bcrypt from 'bcrypt';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns the start (00:00:00.000) and end (23:59:59.999) of today in UTC
 * so Mongoose date-range queries cover the full calendar day.
 */
function getTodayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

// ─── registerPatient / createPatient (Prompt 12.1) ──────────────────────────
// @route   POST /api/receptionist/patient
// @access  Private (Receptionist)
export const registerPatient = async (req, res) => {
  let createdUser = null; // track so we can roll back on Patient failure

  try {
    const {
      firstName, lastName, dob, gender,
      contactPhone, phone, address, abhaId,
      email, password, pin,
      forceCreateNew,
      consentProvided, // Prompt 9.1: Digital Consent for ABDM compliance
    } = req.body;

    // ── Prompt 9.1: Mandatory Digital Consent Validation ───────────────────────
    if (consentProvided !== true && consentProvided !== 'true') {
      return res.status(400).json({
        message: 'Patient consent is legally required to create a health record.',
      });
    }

    // ── Required field validation ───────────────────────────────────────
    if (!firstName || !lastName || !dob || !gender) {
      return res.status(400).json({
        message: 'firstName, lastName, dob, and gender are required.',
      });
    }

    const cleanPin = (pin !== undefined && pin !== null && pin !== '') ? String(pin).trim() : '';
    const effectivePin = cleanPin && /^\d{4}$/.test(cleanPin) ? cleanPin : '1234';

    const cleanPhone = (contactPhone || phone || '').trim();
    const fullName = `${firstName.trim()} ${lastName.trim()}`;
    const userPassword = (password && password.trim().length >= 4) ? password.trim() : `Sahay@${effectivePin}`;
    const cleanEmail = email && email.trim() ? email.trim().toLowerCase() : undefined;

    // ── Prompt 2.3: Smart Patient Disambiguation Flow ─────────────────────────
    // Before creating the Patient document, query for existing records matching firstName, lastName, and dob.
    if (dob && !forceCreateNew) {
      const dobDate = new Date(dob);
      const dayBefore = new Date(dobDate);
      dayBefore.setDate(dayBefore.getDate() - 1);
      const dayAfter = new Date(dobDate);
      dayAfter.setDate(dayAfter.getDate() + 1);

      const matches = await Patient.find({
        firstName: { $regex: `^${firstName.trim()}$`, $options: 'i' },
        lastName:  { $regex: `^${lastName.trim()}$`,  $options: 'i' },
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

    // ── Duplicate check: name + phone match (Prompt 1.1: phone alone is not primary key) ──
    if (cleanPhone && !forceCreateNew) {
      const exactDuplicate = await Patient.findOne({
        contactPhone: cleanPhone,
        firstName: { $regex: `^${firstName.trim()}$`, $options: 'i' },
        lastName:  { $regex: `^${lastName.trim()}$`,  $options: 'i' },
      });
      if (exactDuplicate) {
        return res.status(400).json({
          message: `A patient named ${fullName} with phone ${cleanPhone} is already registered.`,
          existingPatient: {
            _id: exactDuplicate._id,
            uhid: exactDuplicate.uhid,
            fullName: `${exactDuplicate.firstName} ${exactDuplicate.lastName}`,
            contactPhone: exactDuplicate.contactPhone,
          },
        });
      }
    }

    // ── Step 1: Create or find linked User document (Prompt 12.1) ──────────────
    let user = null;
    if (cleanEmail) {
      user = await User.findOne({ email: cleanEmail });
    }

    // Only reuse existing user if it does NOT already have a patientProfileId
    if (user && user.patientProfileId) {
      user = null; // this user account belongs to another person; create a fresh one
    }

    if (!user) {
      createdUser = await User.create({
        name:       fullName,
        phone:      cleanPhone || undefined,
        email:      cleanEmail || undefined,
        password:   userPassword, // hashed by pre-save hook in User.js
        pin:        effectivePin, // Prompt 7.1
        role:       'Patient',
        hospitalId: null,
      });
      user = createdUser;
    } else if (!user.pin) {
      user.pin = effectivePin;
      await user.save();
    }

    // ── Step 2: Create Patient document linked to User._id (Prompt 12.1) ───────
    const patient = await Patient.create({
      firstName:            firstName.trim(),
      lastName:             lastName.trim(),
      dob:                  new Date(dob),
      gender,
      contactPhone:         cleanPhone            || undefined,
      address:              address               || {},
      abhaId:               abhaId?.trim()        || undefined,
      pin:                  effectivePin, // Prompt 7.1
      registeredAtFacility: req.user.hospitalId,
      userId:               user._id,
      consentProvided:      true,
      consentTimestamp:     new Date(),
    });

    // ── Step 3: Two-way binding (Prompt 12.1) ──────────────────────────────────
    user.patientProfileId = patient._id;
    if (!user.phone && cleanPhone) {
      user.phone = cleanPhone;
    }
    await user.save();

    res.status(201).json({
      success: true,
      message: 'Patient registered. They can log in using their phone number and default password: Sahay@123',
      defaultPassword: 'Sahay@123',
      patient: {
        _id:                  patient._id,
        uhid:                 patient.uhid,           // Prompt 1.2
        fullName:             `${patient.firstName} ${patient.lastName}`,
        firstName:            patient.firstName,
        lastName:             patient.lastName,
        dob:                  patient.dob,
        gender:               patient.gender,
        contactPhone:         patient.contactPhone,
        abhaId:               patient.abhaId,
        registeredAtFacility: patient.registeredAtFacility,
        userId:               user._id,
        email:                user.email,
        phone:                user.phone || patient.contactPhone,
        createdAt:            patient.createdAt,
      },
    });
  } catch (error) {
    // Roll back: if Patient creation fails after new User was created, delete orphan User
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

// Export alias for createPatient (Prompt 12.1)
export const createPatient = registerPatient;


// ─── searchPatients (Prompt 12.2) ─────────────────────────────────────────────
// @route   GET /api/receptionist/patient/search?q=<name|phone>
// @access  Private (Receptionist)
// Searches unified Patient collection globally across the database
export const searchPatients = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        message: 'Search query must be at least 2 characters.',
      });
    }

    const term = q.trim();

    const regex = { $regex: term, $options: 'i' };

    // Search unified Patient collection globally — by UHID, firstName, lastName, contactPhone, abhaId (Prompt 1.2)
    const filter = {
      $or: [
        { uhid:         regex },
        { firstName:    regex },
        { lastName:     regex },
        { contactPhone: regex },
        { abhaId:       regex },
      ],
    };

    // If search term has multiple words (e.g. "Ramesh Chandra"), match full name parts
    const parts = term.split(/\s+/);
    if (parts.length > 1) {
      filter.$or.push({
        $and: [
          { firstName: { $regex: parts[0], $options: 'i' } },
          { lastName:  { $regex: parts.slice(1).join(' '), $options: 'i' } },
        ],
      });
    }

    const patients = await Patient.find(filter)
      .select('firstName lastName dob gender contactPhone abhaId uhid registeredAtFacility userId createdAt')
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    // For each patient, check if there is a pending referral to THIS facility
    const facilityId = req.user.hospitalId;
    const patientIds = patients.map((p) => p._id);
    const pendingReferrals = await Referral.find({
      patientId:          { $in: patientIds },
      referredToFacility: facilityId,
      status:             'Pending',
    })
      .populate('referredBy', 'name firstName lastName role')
      .populate('referredFromFacility', 'name hospitalName address city')
      .lean();

    // Build a map: patientId -> referral
    const referralMap = {};
    pendingReferrals.forEach((r) => {
      referralMap[r.patientId.toString()] = r;
    });

    res.json({
      count: patients.length,
      patients: patients.map((p) => ({
        ...p,
        fullName: `${p.firstName} ${p.lastName}`,
        pendingReferral: referralMap[p._id.toString()] || null,
      })),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── createAppointment ────────────────────────────────────────────────────────
// @route   POST /api/receptionist/appointment
// @access  Private (Receptionist)
export const createAppointment = async (req, res) => {
  try {
    const {
      patientId, appointmentDate, assignedDoctorId,
      visitType, chiefComplaint, timeSlot, staffNotes,
      referralId,
    } = req.body;

    if (!patientId || !appointmentDate) {
      return res.status(400).json({
        message: 'patientId and appointmentDate are required.',
      });
    }

    // Verify patient exists globally (Prompt: Fix Global Patient Queue Validation)
    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({
        message: 'Patient not found.',
      });
    }

    // Maintain Queue Security: facilityId is strictly set to req.user.hospitalId
    const appointment = await Appointment.create({
      patientId,
      facilityId:       req.user.hospitalId,
      receptionistId:   req.user._id,
      assignedDoctorId: assignedDoctorId || null,
      appointmentDate:  new Date(appointmentDate),
      status:           'Scheduled',
      visitType:        visitType?.trim()       || undefined,
      chiefComplaint:   chiefComplaint?.trim()  || undefined,
      timeSlot:         timeSlot?.trim()        || undefined,
      staffNotes:       staffNotes?.trim()      || undefined,
    });

    // Check Referral Logic: update Referral document status to 'Arrived'
    if (referralId) {
      await Referral.findByIdAndUpdate(
        referralId,
        { status: 'Arrived', appointmentId: appointment._id },
        { new: true }
      );
    } else {
      await Referral.findOneAndUpdate(
        { patientId, referredToFacility: req.user.hospitalId, status: 'Pending' },
        { status: 'Arrived', appointmentId: appointment._id },
        { new: true }
      );
    }

    await appointment.populate([
      { path: 'patientId',         select: 'firstName lastName contactPhone' },
      { path: 'assignedDoctorId',  select: 'name' },
    ]);

    res.status(201).json({
      message: 'Appointment scheduled successfully.',
      appointment,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── checkInPatient ───────────────────────────────────────────────────────────
// @route   PATCH /api/receptionist/appointment/:id/checkin
// @access  Private (Receptionist)
export const checkInPatient = async (req, res) => {
  try {
    const appointment = await Appointment.findOne({
      _id:        req.params.id,
      facilityId: req.user.hospitalId,
    });

    if (!appointment) {
      return res.status(404).json({
        message: 'Appointment not found in your facility.',
      });
    }

    if (appointment.status === 'CheckedIn') {
      return res.status(400).json({
        message: 'Patient is already checked in.',
        queueNumber: appointment.queueNumber,
      });
    }

    if (['Completed', 'Cancelled'].includes(appointment.status)) {
      return res.status(400).json({
        message: `Cannot check in — appointment is already '${appointment.status}'.`,
      });
    }

    // Assign daily sequential queue number:
    // Count how many appointments at this facility are already CheckedIn today
    const { start, end } = getTodayRange();
    const checkedInCount = await Appointment.countDocuments({
      facilityId:      req.user.hospitalId,
      status:          'CheckedIn',
      appointmentDate: { $gte: start, $lte: end },
    });

    appointment.status      = 'CheckedIn';
    appointment.queueNumber = checkedInCount + 1;
    await appointment.save();

    await appointment.populate([
      { path: 'patientId',        select: 'firstName lastName contactPhone' },
      { path: 'assignedDoctorId', select: 'name' },
    ]);

    res.json({
      message: `Patient checked in. Queue number: ${appointment.queueNumber}.`,
      appointment,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── getTodayQueue ────────────────────────────────────────────────────────────
// @route   GET /api/receptionist/queue/today
// @access  Private (Receptionist)
export const getTodayQueue = async (req, res) => {
  try {
    const { start, end } = getTodayRange();

    const { status } = req.query; // optional filter e.g. ?status=CheckedIn

    const filter = {
      facilityId:      req.user.hospitalId,
      appointmentDate: { $gte: start, $lte: end },
    };

    if (status && ['Waiting', 'Scheduled', 'CheckedIn', 'Completed', 'Cancelled'].includes(status)) {
      filter.status = status;
    }

    const queue = await Appointment.find(filter)
      .populate('patientId',        'firstName lastName contactPhone gender uhid')
      .populate('assignedDoctorId', 'name')
      .populate('receptionistId',   'name')
      .sort({ queueNumber: 1, createdAt: 1 }) // checked-in first (by queue#), then scheduled
      .lean();

    // Attach computed fullName for convenience
    const enriched = queue.map((appt) => ({
      ...appt,
      patientFullName: appt.patientId
        ? `${appt.patientId.firstName} ${appt.patientId.lastName}`
        : 'Unknown',
    }));

    // Summary counts
    const summary = {
      total:     enriched.length,
      waiting:   enriched.filter((a) => a.status === 'Waiting').length,
      scheduled: enriched.filter((a) => a.status === 'Scheduled').length,
      checkedIn: enriched.filter((a) => a.status === 'CheckedIn').length,
      completed: enriched.filter((a) => a.status === 'Completed').length,
      cancelled: enriched.filter((a) => a.status === 'Cancelled').length,
    };

    res.json({ summary, queue: enriched });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── addToQueue ───────────────────────────────────────────────────────────────
// @route   POST /api/receptionist/queue
// @access  Private (Receptionist)
// Body:    { patientId, assignedDoctorId, appointmentDate?, priority? }
export const addToQueue = async (req, res) => {
  try {
    const { patientId, assignedDoctorId, appointmentDate, priority, referralId, urgency } = req.body;

    if (!patientId) {
      return res.status(400).json({ message: 'patientId is required.' });
    }

    if (!assignedDoctorId) {
      return res.status(400).json({ message: 'assignedDoctorId is required — please select a doctor.' });
    }

    // Prompt 4.1: Resolve urgency (Emergency, Urgent, Routine)
    const validUrgencies = ['Emergency', 'Urgent', 'Routine'];
    let resolvedUrgency = 'Routine';
    if (urgency && validUrgencies.includes(urgency)) {
      resolvedUrgency = urgency;
    } else if (priority === 'Urgent') {
      resolvedUrgency = 'Urgent';
    }

    // Validate and sync priority for backward compatibility
    const resolvedPriority = (resolvedUrgency === 'Emergency' || resolvedUrgency === 'Urgent' || priority === 'Urgent')
      ? 'Urgent'
      : 'Routine';

    // hospitalId comes from the Receptionist's JWT (set by authMiddleware)
    // Maintain Queue Security: facilityId of Appointment is strictly set to req.user.hospitalId
    const facilityId = req.user.hospitalId;

    // Verify patient exists globally (Prompt: Fix Global Patient Queue Validation)
    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found.' });
    }

    // Verify the assigned doctor belongs to this facility
    const doctor = await User.findOne({
      _id:       assignedDoctorId,
      role:      'Doctor',
      hospitalId: facilityId,
    }).select('name email');
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found in your facility.' });
    }

    // Use today's date if no appointmentDate supplied
    const queueDate = appointmentDate ? new Date(appointmentDate) : new Date();

    // ── Priority-aware queue numbering ───────────────────────────────────────────
    // Urgent/Emergency patients receive queueNumber = 0 (displayed first in UI).
    // Routine patients receive the next sequential number after all existing
    // Waiting/CheckedIn entries for that doctor today.
    const { start, end } = getTodayRange();

    let queueNumber;
    if (resolvedPriority === 'Urgent') {
      // Queue number 0 signals the front of the line for this doctor today
      queueNumber = 0;
    } else {
      // Count all Waiting/CheckedIn entries for this doctor today to get next number
      const existingCount = await Appointment.countDocuments({
        facilityId,
        assignedDoctorId,
        appointmentDate: { $gte: start, $lte: end },
        status: { $in: ['Waiting', 'CheckedIn'] },
      });
      queueNumber = existingCount + 1;
    }

    // Maintain Queue Security: facilityId is strictly set to req.user.hospitalId
    const appointment = await Appointment.create({
      patientId,
      facilityId,
      receptionistId:   req.user._id,
      assignedDoctorId,
      appointmentDate:  queueDate,
      status:           'Waiting',
      priority:         resolvedPriority,
      urgency:          resolvedUrgency,
      queueNumber,
    });

    // ── Check Referral Logic: update Referral document status to 'Arrived' ────────────
    let updatedReferral = null;
    if (referralId) {
      updatedReferral = await Referral.findByIdAndUpdate(
        referralId,
        { status: 'Arrived', appointmentId: appointment._id },
        { new: true }
      );
    }
    if (!updatedReferral) {
      updatedReferral = await Referral.findOneAndUpdate(
        { patientId, referredToFacility: facilityId, status: 'Pending' },
        { status: 'Arrived', appointmentId: appointment._id },
        { new: true }
      );
    }

    await appointment.populate([
      { path: 'patientId',        select: 'firstName lastName contactPhone gender' },
      { path: 'assignedDoctorId', select: 'name email' },
    ]);

    const priorityLabel = resolvedPriority === 'Urgent' ? '⚠️ URGENT — ' : '';
    res.status(201).json({
      message: `${priorityLabel}Patient added to Dr. ${doctor.name}'s queue. Queue number: ${queueNumber}.`,
      referralUpdated: !!updatedReferral,
      appointment: {
        ...appointment.toObject(),
        patientFullName: `${patient.firstName} ${patient.lastName}`,
        doctorName:      doctor.name,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── scheduleAppointment ──────────────────────────────────────────────────────────
// @route   POST /api/receptionist/appointment/schedule
// @access  Private (Receptionist)
// Body:    { patientId, assignedDoctorId, appointmentDate, timeSlot?, visitType?, chiefComplaint?, staffNotes? }
//
// Creates a future-dated appointment with status 'Scheduled'. Unlike addToQueue
// (which is for same-day walk-ins), this is for booking ahead.
export const scheduleAppointment = async (req, res) => {
  try {
    const {
      patientId,
      assignedDoctorId,
      appointmentDate,
      timeSlot,
      visitType,
      chiefComplaint,
      staffNotes,
    } = req.body;

    // ── Required field validation ──────────────────────────────────────────────────
    if (!patientId || !assignedDoctorId || !appointmentDate) {
      return res.status(400).json({
        message: 'patientId, assignedDoctorId, and appointmentDate are all required.',
      });
    }

    // ── appointmentDate must be in the future ───────────────────────────────────────
    const parsedDate = new Date(appointmentDate);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ message: 'appointmentDate is not a valid date.' });
    }
    // Allow same-day scheduling but reject past dates
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    if (parsedDate < todayStart) {
      return res.status(400).json({
        message: 'appointmentDate must be today or a future date.',
      });
    }

    const facilityId = req.user.hospitalId;

    // ── Verify patient exists globally (Prompt: Fix Global Patient Queue Validation) ────────
    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found.' });
    }

    // ── Verify doctor belongs to this facility ────────────────────────────────────
    const doctor = await User.findOne({
      _id:        assignedDoctorId,
      role:       'Doctor',
      hospitalId: facilityId,
    }).select('name email');
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found in your facility.' });
    }

    // ── Create the scheduled appointment ─────────────────────────────────────────────
    const validUrgencies = ['Emergency', 'Urgent', 'Routine'];
    const resolvedUrgency = validUrgencies.includes(req.body.urgency) ? req.body.urgency : 'Routine';

    const appointment = await Appointment.create({
      patientId,
      facilityId,
      receptionistId:   req.user._id,
      assignedDoctorId,
      appointmentDate:  parsedDate,
      status:           'Scheduled',
      priority:         resolvedUrgency === 'Emergency' || resolvedUrgency === 'Urgent' ? 'Urgent' : 'Routine',
      urgency:          resolvedUrgency,
      timeSlot:         timeSlot?.trim()       || undefined,
      visitType:        visitType?.trim()       || undefined,
      chiefComplaint:   chiefComplaint?.trim()  || undefined,
      staffNotes:       staffNotes?.trim()      || undefined,
    });

    await appointment.populate([
      { path: 'patientId',        select: 'firstName lastName contactPhone gender' },
      { path: 'assignedDoctorId', select: 'name email' },
    ]);

    res.status(201).json({
      message: `Appointment scheduled for ${patient.firstName} ${patient.lastName} with Dr. ${doctor.name} on ${parsedDate.toDateString()}.`,
      appointment: {
        ...appointment.toObject(),
        patientFullName: `${patient.firstName} ${patient.lastName}`,
        doctorName:      doctor.name,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── getFacilityPatients ──────────────────────────────────────────────────────
// @route   GET /api/receptionist/patients
// @access  Private (Receptionist)
// Returns every unique patient who has ever had an appointment at this facility,
// optionally filtered to today with ?today=true
export const getFacilityPatients = async (req, res) => {
  try {
    const facilityId = req.user.hospitalId;
    const { today } = req.query;

    // Build date filter when ?today=true
    const dateFilter = {};
    if (today === 'true') {
      const { start, end } = getTodayRange();
      dateFilter.appointmentDate = { $gte: start, $lte: end };
    }

    // Fetch all appointments at this facility (optionally today only)
    const appointments = await Appointment.find({
      facilityId,
      ...dateFilter,
    })
      .populate('patientId', 'firstName lastName contactPhone gender dob abhaId uhid registeredAtFacility allergies')
      .populate('assignedDoctorId', 'name email')
      .populate('receptionistId', 'name')
      .sort({ appointmentDate: -1, queueNumber: 1 })
      .lean();

    // Enrich with computed fullName and doctorName
    const enriched = appointments.map((appt) => ({
      ...appt,
      patientFullName: appt.patientId
        ? `${appt.patientId.firstName} ${appt.patientId.lastName}`
        : 'Unknown',
      doctorName: appt.assignedDoctorId?.name || null,
    }));

    res.json({
      count: enriched.length,
      appointments: enriched,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── getFacilityDoctors ───────────────────────────────────────────────────────
// @route   GET /api/receptionist/doctors
// @access  Private (Receptionist)
// Returns all doctors linked to the same hospitalId as the logged-in Receptionist.
export const getFacilityDoctors = async (req, res) => {
  try {
    // hospitalId is embedded in the JWT by generateToken and decoded by authMiddleware
    const facilityId = req.user.hospitalId;

    const doctors = await User.find({
      role:      'Doctor',
      hospitalId: facilityId,
    })
      .select('_id name email')
      .sort({ name: 1 })
      .lean();

    res.json({
      count: doctors.length,
      doctors,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── getDoctorsDutyStatus (Prompt: Reception & Doctor Duty Synchronization) ────
// @route   GET /api/reception/doctors-status and GET /api/receptionist/doctors-status
// @access  Private (Receptionist / Staff)
export const getDoctorsDutyStatus = async (req, res) => {
  try {
    const facilityId = req.user.hospitalId;

    const doctorFilter = { role: 'Doctor' };
    if (facilityId) {
      doctorFilter.hospitalId = facilityId;
    }

    const doctors = await User.find(doctorFilter)
      .select('_id name specialty department email isOnDuty dutyStatusUpdatedAt dutyShift')
      .sort({ isOnDuty: -1, name: 1 })
      .lean();

    const { start, end } = getTodayRange();

    const activeStatuses = [
      'Waiting',
      'Waiting for Doctor',
      'CheckedIn',
      'At Triage',
      'In Progress',
      'In Consultation',
      'Reports Ready',
    ];

    const enrichedDoctors = await Promise.all(
      doctors.map(async (doc) => {
        const apptFilter = {
          assignedDoctorId: doc._id,
          appointmentDate: { $gte: start, $lte: end },
          status: { $in: activeStatuses },
        };
        if (facilityId) {
          apptFilter.facilityId = facilityId;
        }

        const activeQueueCount = await Appointment.countDocuments(apptFilter);

        return {
          _id: doc._id,
          name: doc.name,
          specialty: doc.specialty || doc.department || 'General Medicine',
          department: doc.department || 'OPD',
          email: doc.email,
          isOnDuty: Boolean(doc.isOnDuty),
          dutyStatusUpdatedAt: doc.dutyStatusUpdatedAt || null,
          dutyShift: doc.dutyShift || 'OFF',
          activeQueueCount,
        };
      })
    );

    const activeCount = enrichedDoctors.filter((d) => d.isOnDuty).length;

    res.status(200).json({
      success: true,
      count: enrichedDoctors.length,
      activeCount,
      doctors: enrichedDoctors,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── getUpcomingAppointments ──────────────────────────────────────────────────
// @route   GET /api/receptionist/appointments/upcoming
// @access  Private (Receptionist)
// Returns all future scheduled appointments strictly after the end of today for this facility.
export const getUpcomingAppointments = async (req, res) => {
  try {
    const facilityId = req.user.hospitalId;

    // Strict future: greater than end of current day (23:59:59.999)
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const filter = {
      facilityId,
      appointmentDate: { $gt: endOfToday },
      status: { $ne: 'Cancelled' },
    };

    // Optional status query parameter filter (e.g. ?status=Scheduled)
    if (req.query.status) {
      filter.status = req.query.status;
    }

    const appointments = await Appointment.find(filter)
      .populate('patientId', 'firstName lastName contactPhone gender dob abhaId uhid allergies')
      .populate('assignedDoctorId', 'name email')
      .populate('receptionistId', 'name')
      .sort({ appointmentDate: 1 })
      .lean();

    const enriched = appointments.map((appt) => ({
      ...appt,
      patientFullName: appt.patientId
        ? `${appt.patientId.firstName} ${appt.patientId.lastName}`
        : 'Unknown',
      doctorName: appt.assignedDoctorId?.name || null,
    }));

    res.json({
      count: enriched.length,
      appointments: enriched,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── getPendingTeleconsults (Prompt 17.1) ─────────────────────────────────────
// @route   GET /api/receptionist/teleconsults/pending
// @access  Private (Receptionist)
// Fetch all teleconsultation requests for this facility with status 'Teleconsult Requested'
export const getPendingTeleconsults = async (req, res) => {
  try {
    const facilityId = req.user.hospitalId;

    const teleconsults = await Appointment.find({
      facilityId,
      type:   'Teleconsultation',
      status: 'Teleconsult Requested',
    })
      .populate('patientId',        'firstName lastName contactPhone gender dob abhaId uhid allergies')
      .populate('assignedDoctorId', 'name email')
      .populate('receptionistId',   'name firstName lastName role')
      .sort({ createdAt: -1 })
      .lean();

    const enriched = teleconsults.map((appt) => ({
      ...appt,
      patientFullName: appt.patientId
        ? `${appt.patientId.firstName} ${appt.patientId.lastName}`
        : 'Unknown',
      bookedByName: appt.receptionistId?.name
        || (appt.receptionistId?.firstName
          ? `${appt.receptionistId.firstName} ${appt.receptionistId.lastName}`
          : 'Field Worker'),
      sourceLabel: appt.teleconsultSource
        ? `${appt.teleconsultSource}: ${appt.receptionistId?.name || 'Worker'}`
        : 'Self (Patient)',
    }));

    res.json({ count: enriched.length, teleconsults: enriched });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── confirmTeleconsult (Prompt 17.1 & 18.1) ─────────────────────────────────
// @route   POST /api/receptionist/teleconsults/confirm
// @access  Private (Receptionist)
// Accepts appointmentId, assignedDoctorId, scheduledDate, and confirmed timeSlot.
// Generates a unique room string: "sahay-room-" + appointmentId,
// assigns teleconsultRoomId, and updates status to 'Teleconsult Confirmed'.
export const confirmTeleconsult = async (req, res) => {
  try {
    const appointmentId = req.params?.id || req.params?.appointmentId || req.body?.appointmentId || req.body?.id;
    const assignedDoctorId = req.body?.assignedDoctorId || req.body?.doctorId;
    const { scheduledDate, timeSlot } = req.body;

    if (!appointmentId || !assignedDoctorId) {
      return res.status(400).json({
        message: 'appointmentId and assignedDoctorId are required.',
      });
    }

    const facilityId = req.user.hospitalId;

    // Verify appointment exists and belongs to this facility
    const appointment = await Appointment.findOne({
      _id:        appointmentId,
      facilityId,
      type:       'Teleconsultation',
      status:     { $in: ['Teleconsult Requested', 'Teleconsult Scheduled'] },
    });

    if (!appointment) {
      return res.status(404).json({
        message: 'Teleconsult request not found or already processed.',
      });
    }

    // Verify the assigned doctor belongs to this facility
    const doctor = await User.findOne({
      _id:        assignedDoctorId,
      role:       'Doctor',
      hospitalId: facilityId,
    }).select('name email');

    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found in your facility.' });
    }

    // Generate unique Jitsi room string (Prompt 18.1)
    const teleconsultRoomId = `sahay-room-${appointment._id}`;

    // Update appointment fields
    appointment.assignedDoctorId = assignedDoctorId;
    appointment.teleconsultRoomId = teleconsultRoomId;
    appointment.status = 'Teleconsult Confirmed';

    if (scheduledDate) {
      const parsedDate = new Date(scheduledDate);
      if (!isNaN(parsedDate.getTime())) {
        appointment.scheduledDate = parsedDate;
        appointment.appointmentDate = parsedDate;
      }
    }

    if (timeSlot?.trim()) {
      appointment.timeSlot = timeSlot.trim();
    }
    appointment.receptionistId = req.user._id; // Receptionist who confirmed

    await appointment.save();

    await appointment.populate([
      { path: 'patientId',        select: 'firstName lastName contactPhone gender dob abhaId' },
      { path: 'assignedDoctorId', select: 'name email specialization' },
      { path: 'facilityId',       select: 'hospitalName name' },
    ]);

    res.status(200).json({
      success: true,
      message: `Teleconsult confirmed. Dr. ${doctor.name} assigned. Room ID generated.`,
      teleconsultRoomId,
      appointment,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// --- getIncomingReferrals ---
// @route   GET /api/receptionist/referrals/incoming
// @access  Private (Receptionist)
export const getIncomingReferrals = async (req, res) => {
  try {
    const facilityId = req.user.hospitalId;

    const referrals = await Referral.find({
      referredToFacility: facilityId,
      status: 'Pending',
    })
      .populate('patientId',  'firstName lastName contactPhone gender dob abhaId uhid')
      .populate('referredBy', 'name firstName lastName role email')
      .populate('referredFromFacility', 'name hospitalName address city')
      .sort({ createdAt: -1 })
      .lean();

    const enriched = referrals.map((r) => {
      const refName = r.referredBy?.firstName && r.referredBy?.lastName
        ? `${r.referredBy.firstName} ${r.referredBy.lastName}`.trim()
        : r.referredBy?.name || 'Unknown';

      return {
        ...r,
        patientFullName: r.patientId
          ? `${r.patientId.firstName} ${r.patientId.lastName}`
          : 'Unknown',
        ashaWorkerName: refName,
      };
    });

    res.json({ count: enriched.length, referrals: enriched });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── getPendingConflicts (Prompt 2.2) ─────────────────────────────────────────────────────────────
// @route   GET /api/receptionist/conflicts
// @access  Private (Receptionist)
export const getPendingConflicts = async (req, res) => {
  try {
    const facilityId = req.user.hospitalId;

    const conflicts = await SyncConflict.find({
      status: 'Pending',
      $or: [
        { facilityId },
        { facilityId: null }, // show global conflicts too if no facility filter
      ],
    })
      .populate('potentialMatchPatientId', 'firstName lastName dob gender contactPhone abhaId uhid address registeredAtFacility')
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      count:     conflicts.length,
      conflicts,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── resolveConflict (Prompt 2.2) ─────────────────────────────────────────────────────────────
// @route   POST /api/receptionist/conflicts/:id/resolve
// @access  Private (Receptionist)
// Body: { action: 'merge' | 'create_new' }
export const resolveConflict = async (req, res) => {
  try {
    const { id }     = req.params;
    const { action } = req.body;

    if (!['merge', 'create_new'].includes(action)) {
      return res.status(400).json({ message: "action must be 'merge' or 'create_new'" });
    }

    const conflict = await SyncConflict.findById(id);
    if (!conflict) {
      return res.status(404).json({ message: 'Conflict record not found.' });
    }
    if (conflict.status !== 'Pending') {
      return res.status(400).json({ message: 'This conflict has already been resolved.' });
    }

    let responsePayload = {};

    if (action === 'merge') {
      // Discard the duplicate — just mark the conflict resolved.
      // The existing patient retains their ID.
      // Future: attach any vitals/referrals in incomingData to existingPatientId here.
      conflict.status     = 'Merged';
      conflict.resolvedBy = req.user._id;
      conflict.resolvedAt = new Date();
      await conflict.save();

      responsePayload = {
        success: true,
        action:  'merge',
        message: 'Conflict resolved. Incoming duplicate discarded; existing patient record retained.',
        existingPatientId: conflict.potentialMatchPatientId,
      };
    } else {
      // create_new: create a brand-new Patient from incomingData
      const d = conflict.incomingData;
      const firstName  = (d.firstName || '').trim();
      const lastName   = (d.lastName  || '').trim();
      const cleanPhone = (d.contactPhone || d.phone || '').trim();
      const cleanEmail = d.email && d.email.trim()
        ? d.email.trim().toLowerCase()
        : cleanPhone ? `${cleanPhone}@patient.sahay.gov.in` : undefined;

      let user = null;
      if (cleanPhone || cleanEmail) {
        user = await User.findOne({
          $or: [
            ...(cleanPhone  ? [{ phone: cleanPhone }]  : []),
            ...(cleanEmail  ? [{ email: cleanEmail }]  : []),
          ],
        });
      }

      if (!user) {
        user = await User.create({
          name:     `${firstName} ${lastName}`.trim(),
          phone:    cleanPhone || undefined,
          email:    cleanEmail,
          password: 'Sahay@123',
          role:     'Patient',
        });
      }

      const newPatient = await Patient.create({
        firstName,
        lastName,
        dob:                  d.dob ? new Date(d.dob) : undefined,
        gender:               d.gender || 'Other',
        contactPhone:         cleanPhone  || undefined,
        bloodGroup:           d.bloodGroup || undefined,
        address:              d.address   || {},
        abhaId:               d.abhaId?.trim() || undefined,
        userId:               user._id,
        registeredAtFacility: req.user.hospitalId,
      });

      user.patientProfileId = newPatient._id;
      await user.save();

      conflict.status      = 'CreatedNew';
      conflict.resolvedBy  = req.user._id;
      conflict.resolvedAt  = new Date();
      conflict.newPatientId = newPatient._id;
      await conflict.save();

      responsePayload = {
        success:      true,
        action:       'create_new',
        message:      `New patient created with UHID: ${newPatient.uhid}`,
        newPatientId: newPatient._id,
        uhid:         newPatient.uhid,
      };
    }

    res.json(responsePayload);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};