import Patient from '../../models/Patient.js';
import Appointment from '../../models/Appointment.js';
import User from '../../models/User.js';
import Referral from '../../models/Referral.js';
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
      email, password,
    } = req.body;

    // ── Required field validation ──────────────────────────────────────────────
    if (!firstName || !lastName || !dob || !gender) {
      return res.status(400).json({
        message: 'firstName, lastName, dob, and gender are required.',
      });
    }

    const cleanPhone = (contactPhone || phone || '').trim();
    const fullName = `${firstName.trim()} ${lastName.trim()}`;
    const userPassword = (password && password.trim().length >= 6) ? password.trim() : 'Sahay@123';
    const cleanEmail = email && email.trim()
      ? email.trim().toLowerCase()
      : (cleanPhone ? `${cleanPhone}@patient.sahay.gov.in` : undefined);

    // ── Duplicate phone check on Patient collection ─────────────────────────────
    if (cleanPhone) {
      const phoneExists = await Patient.findOne({ contactPhone: cleanPhone });
      if (phoneExists) {
        return res.status(400).json({
          message: `A patient with phone ${cleanPhone} is already registered.`,
          existingPatient: {
            _id: phoneExists._id,
            fullName: `${phoneExists.firstName} ${phoneExists.lastName}`,
            contactPhone: phoneExists.contactPhone,
          },
        });
      }
    }

    // ── Step 1: Create or find linked User document (Prompt 12.1) ──────────────
    let user = null;
    if (cleanPhone) {
      user = await User.findOne({
        $or: [
          { phone: cleanPhone },
          ...(cleanEmail ? [{ email: cleanEmail }] : []),
        ],
      });
    } else if (cleanEmail) {
      user = await User.findOne({ email: cleanEmail });
    }

    if (!user) {
      createdUser = await User.create({
        name:     fullName,
        phone:    cleanPhone || undefined,
        email:    cleanEmail,
        password: userPassword, // hashed by pre-save hook in User.js
        role:     'Patient',
        hospitalId: null,
      });
      user = createdUser;
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
      registeredAtFacility: req.user.hospitalId,
      userId:               user._id,
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

    // Search unified Patient collection globally across firstName, lastName, contactPhone, or abhaId (Prompt 12.2)
    const filter = {
      $or: [
        { firstName: regex },
        { lastName:  regex },
        { contactPhone: regex },
        { abhaId: regex },
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
      .select('firstName lastName dob gender contactPhone abhaId registeredAtFacility userId createdAt')
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
      .populate('patientId',        'firstName lastName contactPhone gender')
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
    const { patientId, assignedDoctorId, appointmentDate, priority, referralId } = req.body;

    if (!patientId) {
      return res.status(400).json({ message: 'patientId is required.' });
    }

    if (!assignedDoctorId) {
      return res.status(400).json({ message: 'assignedDoctorId is required — please select a doctor.' });
    }

    // Validate priority if supplied
    const resolvedPriority = priority === 'Urgent' ? 'Urgent' : 'Routine';

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
    // Urgent patients receive queueNumber = 0 (displayed first in UI).
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
    const appointment = await Appointment.create({
      patientId,
      facilityId,
      receptionistId:   req.user._id,
      assignedDoctorId,
      appointmentDate:  parsedDate,
      status:           'Scheduled',
      priority:         'Routine', // future bookings are Routine by default
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
      .populate('patientId', 'firstName lastName contactPhone gender dob abhaId registeredAtFacility')
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
      .populate('patientId', 'firstName lastName contactPhone gender dob abhaId')
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
      .populate('patientId',        'firstName lastName contactPhone gender dob abhaId')
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
    const { appointmentId, assignedDoctorId, scheduledDate, timeSlot } = req.body;

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
      .populate('patientId',  'firstName lastName contactPhone gender dob abhaId')
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