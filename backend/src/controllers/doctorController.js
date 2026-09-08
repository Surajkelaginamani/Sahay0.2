import Appointment from '../models/Appointment.js';
import Consultation from '../models/Consultation.js';
import Patient from '../models/Patient.js';
import LabInvestigationOrder from '../models/LabInvestigationOrder.js';

// ---------------------------------------------------------------------------
// @desc    Get today's patient queue for the authenticated doctor's hospital
// @route   GET /api/doctor/queue
// @access  Private (Doctor)
// ---------------------------------------------------------------------------
export const getTodayQueue = async (req, res) => {
  try {
    const doctorId = req.user._id;
    const hospitalId = req.user.hospitalId;

    if (!hospitalId) {
      return res.status(400).json({ message: 'Doctor account is not linked to a hospital.' });
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const appointments = await Appointment.find({
      doctor: doctorId,
      hospital: hospitalId,
      appointmentDate: { $gte: startOfDay, $lte: endOfDay },
      status: { $in: ['Waiting', 'In Progress', 'Completed'] },
    })
      .populate('patient', 'name dateOfBirth gender abhaId contactPhone')
      .sort({ tokenNumber: 1 });

    const waiting = appointments.filter((a) => a.status === 'Waiting');
    const inProgress = appointments.filter((a) => a.status === 'In Progress');
    const completed = appointments.filter((a) => a.status === 'Completed');

    res.status(200).json({ waiting, inProgress, completed });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ---------------------------------------------------------------------------
// @desc    Mark an appointment as "In Progress" when doctor opens the consult form
// @route   PATCH /api/doctor/appointment/:appointmentId/start
// @access  Private (Doctor)
// ---------------------------------------------------------------------------
export const startAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findOneAndUpdate(
      {
        _id: req.params.appointmentId,
        doctor: req.user._id,
        status: 'Waiting',
      },
      { status: 'In Progress' },
      { new: true }
    ).populate('patient', 'name dateOfBirth gender abhaId contactPhone');

    if (!appointment) {
      // Either not found, not theirs, or already past "Waiting" — return gracefully
      const existing = await Appointment.findById(req.params.appointmentId)
        .populate('patient', 'name dateOfBirth gender abhaId contactPhone');
      return res.status(200).json(existing || { message: 'Appointment not found' });
    }

    res.status(200).json(appointment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ---------------------------------------------------------------------------
// @desc    Get the full chronological history (timeline) for a specific patient
//          Aggregates Consultations and Appointments across all SAHAY facilities
// @route   GET /api/doctor/patient/:patientId/timeline
// @access  Private (Doctor)
// ---------------------------------------------------------------------------
export const getPatientTimeline = async (req, res) => {
  try {
    const { patientId } = req.params;

    // Verify patient exists
    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    // All appointments for this patient across ALL hospitals (network-wide)
    const appointments = await Appointment.find({ patient: patientId })
      .select('_id appointmentDate hospital doctor status chiefComplaint')
      .populate('hospital', 'hospitalName address')
      .populate('doctor', 'name')
      .sort({ appointmentDate: -1 });

    const appointmentIds = appointments.map((a) => a._id);

    // All consultations linked to those appointments
    const consultations = await Consultation.find({
      appointment: { $in: appointmentIds },
    })
      .populate({
        path: 'appointment',
        select: 'appointmentDate',
        populate: { path: 'hospital', select: 'hospitalName address' },
      })
      .populate('hospital', 'hospitalName address')
      .populate('doctor', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({ patient, appointments, consultations });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ---------------------------------------------------------------------------
// @desc    Save a completed consultation and push investigation orders
//          to the LabHead's queue (via Consultation.investigationOrders)
// @route   POST /api/doctor/consultation
// @access  Private (Doctor)
// ---------------------------------------------------------------------------
export const saveConsultation = async (req, res) => {
  try {
    const {
      appointmentId,
      chiefComplaints,
      clinicalObservations,
      diagnosis,
      icdCodes,
      prescription,
      investigationOrders,
      referral,
      followUpDate,
    } = req.body;

    if (!appointmentId) {
      return res.status(400).json({ message: 'appointmentId is required.' });
    }

    // Verify the appointment belongs to this doctor
    const appointment = await Appointment.findOne({
      _id: appointmentId,
      doctor: req.user._id,
    });

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found or access denied.' });
    }

    // Normalize investigation orders — default routing to LabHead
    const normalizedOrders = (investigationOrders || []).map((order) => ({
      testName: order.testName || order,
      routedTo: order.routedTo || 'LabHead',
      status: 'Ordered',
      orderedAt: new Date(),
    }));

    // Save the consultation
    const consultation = await Consultation.create({
      appointment: appointmentId,
      chiefComplaints: chiefComplaints || '',
      clinicalObservations: clinicalObservations || '',
      diagnosis: diagnosis || '',
      icdCodes: icdCodes || [],
      prescription: (prescription || []).filter((p) => p.medicineName?.trim()),
      investigationOrders: normalizedOrders,
      referral: referral || {},
      followUpDate: followUpDate || null,
      doctor: req.user._id,
      hospital: req.user.hospitalId,
    });

    // Mark the appointment as Completed
    appointment.status = 'Completed';
    await appointment.save();

    // --- Push each investigation order into the LabHead's queue ---
    if (normalizedOrders.length > 0) {
      const labDocs = normalizedOrders.map((order) => ({
        consultation: consultation._id,
        patient: appointment.patient,
        orderedBy: req.user._id,
        hospital: req.user.hospitalId,
        testName: order.testName,
        routedTo: order.routedTo,
        status: 'Ordered',
        clinicalNotes: order.notes || null,
      }));
      await LabInvestigationOrder.insertMany(labDocs);
    }

    // Populate for the response
    await consultation.populate('doctor', 'name');
    await consultation.populate('hospital', 'hospitalName');

    res.status(201).json({
      message: 'Consultation saved successfully.',
      consultation,
      investigationsRouted: normalizedOrders.length,
      labOrdersCreated: normalizedOrders.length,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ---------------------------------------------------------------------------
// @desc    Get a single patient's profile
// @route   GET /api/doctor/patient/:patientId
// @access  Private (Doctor)
// ---------------------------------------------------------------------------
export const getPatientProfile = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.patientId);
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }
    res.status(200).json(patient);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export {
  getPatientHistory,
  requestLabTest,
  closeConsultation,
} from '../modules/doctor/doctorController.js';

