import Appointment from '../models/Appointment.js';
import Patient from '../models/Patient.js';
import User from '../models/User.js';

// ─── Role → Source mapping ────────────────────────────────────────────────────
const ROLE_TO_SOURCE = {
  ASHA:      'ASHA',
  AshaWorker:'ASHA',
  Nurse:     'Nurse',
  Patient:   'Patient',
};

// ─── bookTeleconsult (Prompt 17.1) ───────────────────────────────────────────
// @route   POST /api/teleconsult/book
// @access  Private (ASHA, Nurse, Patient)
// Accepts patientId, facilityId (target hospital), departmentId or doctorId,
// scheduledDate, timeSlot, chiefComplaint. Determines teleconsultSource from
// req.user.role and sets status = 'Teleconsult Requested'.
export const bookTeleconsult = async (req, res) => {
  try {
    const {
      patientId,
      facilityId,
      departmentId,
      doctorId,
      scheduledDate,
      timeSlot,
      chiefComplaint,
    } = req.body;

    // ── Required fields ────────────────────────────────────────────────────────
    if (!patientId || !facilityId || !scheduledDate) {
      return res.status(400).json({
        message: 'patientId, facilityId, and scheduledDate are required.',
      });
    }

    // ── Determine patient (for ASHA/Nurse) or use logged-in patient ───────────
    let resolvedPatientId = patientId;
    const userRole = req.user.role;

    if (userRole === 'Patient') {
      // Patients can only book for themselves; use their linked patientProfileId
      resolvedPatientId = req.user.patientProfileId || patientId;
    }

    const patient = await Patient.findById(resolvedPatientId);
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found.' });
    }

    // ── Determine teleconsultSource from caller's role ─────────────────────────
    const teleconsultSource = ROLE_TO_SOURCE[userRole] || 'Patient';

    // ── Build receptionistId stub: if worker is not a Receptionist, use null ──
    // Teleconsult bookings are created without a Receptionist; we attach them
    // later when a Receptionist confirms via confirmTeleconsult.
    // The field is required on the schema; we use a system placeholder: req.user._id.
    const receptionistId = req.user._id;

    const parsedDate = new Date(scheduledDate);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ message: 'scheduledDate is not a valid date.' });
    }

    // ── Create the Appointment with Teleconsult Requested status ──────────────
    const appointment = await Appointment.create({
      patientId:        resolvedPatientId,
      facilityId,
      receptionistId,            // caller (ASHA/Nurse/Patient) acts as booker
      assignedDoctorId: doctorId || null,
      appointmentDate:  parsedDate,
      scheduledDate:    parsedDate,
      timeSlot:         timeSlot?.trim() || undefined,
      chiefComplaint:   chiefComplaint?.trim() || undefined,
      type:             'Teleconsultation',
      teleconsultSource,
      status:           'Teleconsult Requested',
      priority:         'Routine',
    });

    await appointment.populate([
      { path: 'patientId',        select: 'firstName lastName contactPhone gender dob' },
      { path: 'facilityId',       select: 'hospitalName name address city' },
      { path: 'assignedDoctorId', select: 'name email' },
    ]);

    res.status(201).json({
      success: true,
      message: 'Teleconsult request submitted for hospital review.',
      appointment,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Duplicate appointment entry.' });
    }
    res.status(500).json({ message: error.message });
  }
};

// ─── getMyTeleconsults (Prompt 17.4 — Village/Patient side) ─────────────────
// @route   GET /api/teleconsult/my
// @access  Private (ASHA, Nurse, Patient)
// Returns all teleconsultation appointments booked by the logged-in worker/patient.
export const getMyTeleconsults = async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;

    let filter = {
      type:   'Teleconsultation',
      status: { $in: ['Teleconsult Requested', 'Teleconsult Scheduled', 'In Teleconsult', 'Completed'] },
    };

    if (userRole === 'Patient') {
      // Patients see their own appointments
      let resolvedPid = req.user.patientProfileId;
      if (!resolvedPid) {
        const patient = await Patient.findOne({ userId });
        if (patient) resolvedPid = patient._id;
      }
      if (resolvedPid) {
        filter.$or = [{ patientId: resolvedPid }, { receptionistId: userId }];
      } else {
        filter.receptionistId = userId;
      }
    } else {
      // ASHA / Nurse see appointments they booked (as receptionistId)
      filter.receptionistId = userId;
    }

    const teleconsults = await Appointment.find(filter)
      .populate('patientId',        'firstName lastName contactPhone gender dob')
      .populate('facilityId',       'hospitalName name address')
      .populate('assignedDoctorId', 'name email')
      .sort({ scheduledDate: 1, createdAt: -1 })
      .lean();

    const enriched = teleconsults.map((appt) => ({
      ...appt,
      patientFullName: appt.patientId
        ? `${appt.patientId.firstName} ${appt.patientId.lastName}`
        : 'Unknown',
      facilityName: appt.facilityId?.hospitalName || appt.facilityId?.name || 'Unknown Facility',
      doctorName:   appt.assignedDoctorId?.name || 'TBD (Pending Assignment)',
      canJoin:      appt.status === 'Teleconsult Scheduled' && !!appt.teleconsultRoomId,
    }));

    res.json({ count: enriched.length, teleconsults: enriched });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
