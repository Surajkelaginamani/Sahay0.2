import Appointment from '../../models/Appointment.js';
import Vitals from '../../models/Vitals.js';
import LabOrder from '../../models/LabOrder.js';
import User from '../../models/User.js';
import Patient from '../../models/Patient.js';

// ─── Helper to calculate BMI ──────────────────────────────────────────────────
function calculateBMI(heightCm, weightKg) {
  const h = parseFloat(heightCm);
  const w = parseFloat(weightKg);
  if (!h || !w || h <= 0 || w <= 0) return null;
  const meters = h / 100;
  const bmi = w / (meters * meters);
  return bmi.toFixed(1);
}

// ─── getTriageQueue ───────────────────────────────────────────────────────────
// @route   GET /api/nurse/queue
// @access  Private (Nurse)
// Queries appointments for the nurse's facility where status is 'At Triage' or 'CheckedIn'.
export const getTriageQueue = async (req, res) => {
  try {
    const facilityId = req.user.hospitalId;
    if (!facilityId) {
      return res.status(400).json({ message: 'Nurse account is not linked to a hospital facility.' });
    }

    // Query appointments waiting for vitals / triage
    const appointments = await Appointment.find({
      facilityId,
      status: { $in: ['At Triage', 'CheckedIn'] },
    })
      .populate('patientId', 'firstName lastName contactPhone gender dob abhaId bloodGroup address emergencyContact uhid allergies')
      .populate('assignedDoctorId', 'name email')
      .lean();

    // Sort: Urgent triage patients first, then by queueNumber or appointmentDate
    appointments.sort((a, b) => {
      const aUrgent = a.priority === 'Urgent';
      const bUrgent = b.priority === 'Urgent';
      if (aUrgent && !bUrgent) return -1;
      if (!aUrgent && bUrgent) return 1;

      if (a.queueNumber && b.queueNumber) return a.queueNumber - b.queueNumber;

      const dateA = new Date(a.appointmentDate || a.createdAt).getTime();
      const dateB = new Date(b.appointmentDate || b.createdAt).getTime();
      return dateA - dateB;
    });

    // Enrich with computed patientFullName
    const enriched = appointments.map((appt) => ({
      ...appt,
      patientFullName: appt.patientId
        ? `${appt.patientId.firstName} ${appt.patientId.lastName}`
        : 'Unknown Patient',
    }));

    // Metrics summary
    const summary = {
      total:    enriched.length,
      urgent:   enriched.filter((a) => a.priority === 'Urgent').length,
      routine:  enriched.filter((a) => a.priority !== 'Urgent').length,
      atTriage: enriched.filter((a) => a.status === 'At Triage').length,
    };

    res.status(200).json({
      count: enriched.length,
      summary,
      queue: enriched,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── captureVitals ────────────────────────────────────────────────────────────
// @route   POST /api/nurse/vitals
// @access  Private (Nurse)
// Captures patient vitals, saves a Vitals record, and transitions appointment to 'Waiting for Doctor'.
export const captureVitals = async (req, res) => {
  try {
    const {
      appointmentId,
      bloodPressure,
      bloodSugar,
      height,
      weight,
      temperature,
      pulse,
      spO2,
      notes,
      urgency,
    } = req.body;

    if (!appointmentId) {
      return res.status(400).json({ message: 'Appointment ID is required.' });
    }

    if (!bloodPressure || !bloodSugar || !height || !weight) {
      return res.status(400).json({
        message: 'Please provide all core vitals: Blood Pressure, Blood Sugar, Height, and Weight.',
      });
    }

    // Verify appointment exists
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found.' });
    }

    const facilityId = req.user.hospitalId || appointment.facilityId;
    const patientId = appointment.patientId;
    const nurseId = req.user._id;

    // Calculate BMI
    const computedBmi = calculateBMI(height, weight);

    // 1. Create Vitals record (Prompt 6.2)
    const vitalsRecord = await Vitals.create({
      appointmentId,
      patientId,
      nurseId,
      facilityId,
      bloodPressure: String(bloodPressure).trim(),
      bloodSugar:    String(bloodSugar).trim(),
      height:        String(height).trim(),
      weight:        String(weight).trim(),
      temperature:   temperature ? String(temperature).trim() : undefined,
      pulse:         pulse ? String(pulse).trim() : undefined,
      spO2:          spO2 ? String(spO2).trim() : undefined,
      bmi:           computedBmi || undefined,
      notes:         notes?.trim() || undefined,
    });

    // 2. Snapshot vitals directly on the appointment document
    appointment.vitals = {
      bloodPressure: String(bloodPressure).trim(),
      bloodSugar:    String(bloodSugar).trim(),
      height:        String(height).trim(),
      weight:        String(weight).trim(),
      temperature:   temperature ? String(temperature).trim() : undefined,
      pulse:         pulse ? String(pulse).trim() : undefined,
      spO2:          spO2 ? String(spO2).trim() : undefined,
      bmi:           computedBmi || undefined,
      notes:         notes?.trim() || undefined,
      recordedBy:    nurseId,
      recordedAt:    new Date(),
    };

    // Prompt 4.1: Handle urgency update if supplied
    if (urgency && ['Emergency', 'Urgent', 'Routine'].includes(urgency)) {
      appointment.urgency = urgency;
      appointment.priority = (urgency === 'Emergency' || urgency === 'Urgent') ? 'Urgent' : 'Routine';
    }

    // Prompt 5.2: Save allergies if supplied
    if (Array.isArray(req.body.allergies)) {
      const patientDoc = await Patient.findById(patientId);
      if (patientDoc) {
        patientDoc.allergies = Array.from(new Set(req.body.allergies.map((a) => String(a).trim()).filter(Boolean)));
        await patientDoc.save();
      }
    }

    // 3. Immediately update Appointment status from 'At Triage' to 'Waiting for Doctor' (Prompt 6.2)
    appointment.status = 'Waiting for Doctor';
    await appointment.save();

    await appointment.populate([
      { path: 'patientId', select: 'firstName lastName contactPhone gender dob allergies' },
      { path: 'assignedDoctorId', select: 'name email' },
    ]);

    res.status(201).json({
      message: 'Vitals captured successfully. Patient forwarded to Doctor queue.',
      vitals: vitalsRecord,
      appointment,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── forwardToDoctor (Prompt 4.1) ──────────────────────────────────────────────
// @route   POST /api/nurse/forward-to-doctor
// @access  Private (Nurse)
// Forwards a triage patient to the doctor's queue with specified urgency level.
export const forwardToDoctor = async (req, res) => {
  try {
    const { appointmentId, urgency = 'Routine', notes } = req.body;

    if (!appointmentId) {
      return res.status(400).json({ message: 'Appointment ID is required.' });
    }

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found.' });
    }

    const validUrgencies = ['Emergency', 'Urgent', 'Routine'];
    const resolvedUrgency = validUrgencies.includes(urgency) ? urgency : 'Routine';

    appointment.urgency = resolvedUrgency;
    appointment.priority = (resolvedUrgency === 'Emergency' || resolvedUrgency === 'Urgent') ? 'Urgent' : 'Routine';
    appointment.status = 'Waiting for Doctor';

    if (notes) {
      appointment.staffNotes = notes.trim();
    }

    // Prompt 5.2: Save allergies if supplied
    if (Array.isArray(req.body.allergies) && appointment.patientId) {
      const patientDoc = await Patient.findById(appointment.patientId);
      if (patientDoc) {
        patientDoc.allergies = Array.from(new Set(req.body.allergies.map((a) => String(a).trim()).filter(Boolean)));
        await patientDoc.save();
      }
    }

    await appointment.save();

    await appointment.populate([
      { path: 'patientId', select: 'firstName lastName contactPhone gender dob uhid allergies' },
      { path: 'assignedDoctorId', select: 'name email' },
    ]);

    res.status(200).json({
      success: true,
      message: `Patient forwarded to doctor queue with '${resolvedUrgency}' urgency.`,
      appointment,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── getLabQueue (Prompt 8.2) ─────────────────────────────────────────────────
// @route   GET /api/nurse/lab-queue
// @access  Private (Nurse)
// Fetches appointments with status 'Lab Pending' or 'Reports Ready' for facility.
export const getLabQueue = async (req, res) => {
  try {
    const facilityId = req.user.hospitalId || req.user.facilityId;
    if (!facilityId) {
      return res.status(400).json({ message: 'Nurse account is not linked to a facility.' });
    }

    const appointments = await Appointment.find({
      $or: [
        { facilityId },
        { hospital: facilityId },
      ],
      status: { $in: ['Lab Pending', 'Reports Ready'] },
    })
      .populate('patientId', 'firstName lastName contactPhone gender dob abhaId bloodGroup uhid allergies')
      .populate('assignedDoctorId', 'name email')
      .sort({ updatedAt: -1 })
      .lean();

    // Fetch related LabOrders for each appointment
    const appointmentIds = appointments.map((a) => a._id);
    const labOrders = await LabOrder.find({
      appointmentId: { $in: appointmentIds },
    })
      .populate('doctorId', 'name')
      .sort({ createdAt: -1 })
      .lean();

    // Map labOrders onto each appointment (Prompt 6.1 & 6.2)
    const enriched = appointments.map((appt) => {
      const orders = labOrders.filter(
        (lo) => lo.appointmentId.toString() === appt._id.toString()
      );
      const hasCritical = orders.some((o) => o.isCritical) || appt.isCriticalLab || false;
      return {
        ...appt,
        isCriticalLab: hasCritical,
        patientFullName: appt.patientId
          ? `${appt.patientId.firstName} ${appt.patientId.lastName}`
          : 'Unknown Patient',
        labOrders: orders,
        latestLabOrder: orders[0] || null,
      };
    });

    const pendingLabs = enriched.filter((a) => a.status === 'Lab Pending');
    const reportsReady = enriched.filter((a) => a.status === 'Reports Ready');

    // Prompt 6.2: Place critical lab results at the very top of the review queue
    reportsReady.sort((a, b) => {
      const aCrit = a.isCriticalLab || a.labOrders?.some((o) => o.isCritical) ? 1 : 0;
      const bCrit = b.isCriticalLab || b.labOrders?.some((o) => o.isCritical) ? 1 : 0;
      if (aCrit !== bCrit) return bCrit - aCrit;
      return 0;
    });

    const criticalCount = reportsReady.filter((a) => a.isCriticalLab || a.labOrders?.some((o) => o.isCritical)).length;

    res.status(200).json({
      success: true,
      count: enriched.length,
      counts: {
        labPending: pendingLabs.length,
        reportsReady: reportsReady.length,
        criticalLabs: criticalCount,
      },
      pendingLabs,
      reportsReady,
      all: enriched,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── forwardToLab (Prompt 8.2) ────────────────────────────────────────────────
// @route   POST /api/nurse/forward-to-lab
// @access  Private (Nurse)
// Acknowledges forwarding to lab in database
export const forwardToLab = async (req, res) => {
  try {
    const { appointmentId } = req.body;
    if (!appointmentId) {
      return res.status(400).json({ message: 'Appointment ID is required.' });
    }

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found.' });
    }

    appointment.labForwarded = true;
    appointment.labForwardedAt = new Date();
    await appointment.save();

    res.status(200).json({
      success: true,
      message: 'Lab order acknowledged and forwarded to Laboratory Head.',
      appointment,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── notifyDoctor (Prompt 8.2) ────────────────────────────────────────────────
// @route   POST /api/nurse/notify-doctor
// @access  Private (Nurse)
// Updates doctorQueueType to 'Review', keeping status 'Reports Ready'
export const notifyDoctor = async (req, res) => {
  try {
    const { appointmentId } = req.body;
    if (!appointmentId) {
      return res.status(400).json({ message: 'Appointment ID is required.' });
    }

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found.' });
    }

    appointment.doctorQueueType = 'Review';
    appointment.status = 'Reports Ready';
    await appointment.save();

    res.status(200).json({
      success: true,
      message: 'Doctor notified and patient moved to Doctor Review Queue.',
      appointment,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── requestTeleconsult (Prompt 16.1) ────────────────────────────────────────
// @route   POST /api/nurse/request-teleconsult
// @access  Private (Nurse)
export const requestTeleconsult = async (req, res) => {
  try {
    const { appointmentId, doctorId } = req.body;
    if (!appointmentId || !doctorId) {
      return res.status(400).json({ message: 'appointmentId and doctorId are required.' });
    }

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found.' });
    }

    // Generate unique teleconsultation room ID
    const cleanApptId = appointmentId.toString().slice(-8);
    const timestamp = Date.now();
    const teleconsultRoomId = `Sahay-Tele-${cleanApptId}-${timestamp}`;

    appointment.assignedDoctorId = doctorId;
    appointment.teleconsultRoomId = teleconsultRoomId;
    appointment.status = 'Teleconsult Requested';
    await appointment.save();

    if (Array.isArray(req.body.allergies) && appointment.patientId) {
      const patientDoc = await Patient.findById(appointment.patientId);
      if (patientDoc) {
        patientDoc.allergies = Array.from(new Set(req.body.allergies.map((a) => String(a).trim()).filter(Boolean)));
        await patientDoc.save();
      }
    }

    await appointment.populate([
      { path: 'patientId', select: 'firstName lastName contactPhone gender dob abhaId allergies' },
      { path: 'assignedDoctorId', select: 'name email' },
      { path: 'facilityId', select: 'hospitalName address' },
    ]);

    res.status(200).json({
      success: true,
      message: 'Teleconsultation requested successfully.',
      teleconsultRoomId,
      appointment,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── getAvailableDoctors ──────────────────────────────────────────────────────
// @route   GET /api/nurse/doctors
// @access  Private (Nurse)
export const getAvailableDoctors = async (req, res) => {
  try {
    const facilityId = req.user?.hospitalId;

    // First attempt to get doctors in the same hospital facility
    let doctors = [];
    if (facilityId) {
      doctors = await User.find({ role: 'Doctor', hospitalId: facilityId })
        .select('_id name email specialization hospitalId')
        .populate('hospitalId', 'hospitalName')
        .lean();
    }

    // If no local doctors found, fetch approved active doctors system-wide
    if (doctors.length === 0) {
      doctors = await User.find({ role: 'Doctor' })
        .select('_id name email specialization hospitalId')
        .populate('hospitalId', 'hospitalName')
        .limit(25)
        .lean();
    }

    res.status(200).json({
      count: doctors.length,
      doctors,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

