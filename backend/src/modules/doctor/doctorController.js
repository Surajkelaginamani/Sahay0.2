import Appointment from '../../models/Appointment.js';
import Consultation from '../../models/Consultation.js';
import Patient from '../../models/Patient.js';
import Prescription from '../../models/Prescription.js';
import LabOrder from '../../models/LabOrder.js';
import Vitals from '../../models/Vitals.js';
import LabInvestigationOrder from '../../models/LabInvestigationOrder.js';

// ─── getDoctorQueue ───────────────────────────────────────────────────────────
// @route   GET /api/doctor/queue
// @access  Private (Doctor)
// Returns all waiting and checked-in patients assigned to the logged-in doctor,
// separated into activeQueue ('Waiting', 'CheckedIn', 'Waiting for Doctor') and reviewQueue ('Reports Ready').
export const getDoctorQueue = async (req, res) => {
  try {
    const doctorId = req.user._id;

    // Fetch appointments where assignedDoctorId is this doctor and status is Waiting, CheckedIn, Waiting for Doctor, or Reports Ready
    const appointments = await Appointment.find({
      assignedDoctorId: doctorId,
      status: { $in: ['Waiting', 'CheckedIn', 'Waiting for Doctor', 'Reports Ready'] },
    })
      .populate('patientId', 'firstName lastName contactPhone gender dob abhaId address bloodGroup emergencyContact')
      .populate('facilityId', 'hospitalName address')
      .lean();

    // Fetch related LabOrders to attach to reviewQueue items
    const apptIds = appointments.map((a) => a._id);
    const labOrders = await LabOrder.find({
      appointmentId: { $in: apptIds },
    })
      .sort({ updatedAt: -1 })
      .lean();

    // Explicit JS sort to guarantee Urgent first, then chronological
    appointments.sort((a, b) => {
      // Urgent first
      const aUrgent = a.priority === 'Urgent';
      const bUrgent = b.priority === 'Urgent';
      if (aUrgent && !bUrgent) return -1;
      if (!aUrgent && bUrgent) return 1;

      // Sequential queueNumber if available
      if (a.queueNumber && b.queueNumber) return a.queueNumber - b.queueNumber;

      // Otherwise chronological by appointmentDate / createdAt
      const dateA = new Date(a.appointmentDate || a.createdAt).getTime();
      const dateB = new Date(b.appointmentDate || b.createdAt).getTime();
      return dateA - dateB;
    });

    // Enrich with computed patientFullName and attached LabOrders
    const enriched = appointments.map((appt) => {
      const orders = labOrders.filter(
        (lo) => lo.appointmentId.toString() === appt._id.toString()
      );
      return {
        ...appt,
        patientFullName: appt.patientId
          ? `${appt.patientId.firstName} ${appt.patientId.lastName}`
          : 'Unknown Patient',
        labOrders: orders,
        completedLabOrder: orders.find((o) => o.status === 'Completed') || orders[0] || null,
      };
    });

    // Prompt 8.4: Two distinct queues
    // 1. Active ongoing queue
    const activeQueue = enriched.filter((a) =>
      ['Waiting', 'CheckedIn', 'Waiting for Doctor', 'In Progress'].includes(a.status)
    );
    // 2. Review queue for patients whose lab tests are finished
    const reviewQueue = enriched.filter((a) => a.status === 'Reports Ready');

    const waiting    = enriched.filter((a) => a.status === 'Waiting');
    const inProgress = enriched.filter((a) => ['CheckedIn', 'Waiting for Doctor', 'In Progress'].includes(a.status));
    const completed  = enriched.filter((a) => a.status === 'Completed');

    // Calculate queue summary metrics
    const summary = {
      total:        enriched.length,
      active:       activeQueue.length,
      reportsReady: reviewQueue.length,
      urgent:       enriched.filter((a) => a.priority === 'Urgent').length,
      routine:      enriched.filter((a) => a.priority !== 'Urgent').length,
      checkedIn:    enriched.filter((a) => a.status === 'CheckedIn').length,
      waiting:      waiting.length,
    };

    res.status(200).json({
      count: enriched.length,
      summary,
      activeQueue,
      reviewQueue,
      queue: enriched,
      waiting,
      inProgress,
      completed,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── startAppointment ─────────────────────────────────────────────────────────
// @route   PATCH /api/doctor/appointment/:appointmentId/start
// @access  Private (Doctor)
export const startAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findOneAndUpdate(
      {
        _id: req.params.appointmentId,
        assignedDoctorId: req.user._id,
      },
      { status: 'CheckedIn' },
      { new: true }
    ).populate('patientId', 'firstName lastName contactPhone gender dob abhaId');

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found.' });
    }

    res.status(200).json(appointment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── getPatientTimeline ───────────────────────────────────────────────────────
// @route   GET /api/doctor/patient/:patientId/timeline
// @access  Private (Doctor)
export const getPatientTimeline = async (req, res) => {
  try {
    const { patientId } = req.params;
    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    const appointments = await Appointment.find({ patientId })
      .populate('facilityId', 'hospitalName address')
      .populate('assignedDoctorId', 'name')
      .sort({ appointmentDate: -1 });

    const consultations = await Consultation.find({ patientId })
      .populate('facilityId', 'hospitalName address')
      .populate('doctorId', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({ patient, appointments, consultations });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── getPatientProfile ────────────────────────────────────────────────────────
// @route   GET /api/doctor/patient/:patientId
// @access  Private (Doctor)
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

// ─── submitConsultation ───────────────────────────────────────────────────────
// @route   POST /api/doctor/consultation
// @access  Private (Doctor)
// Saves an ABDM-compliant Consultation document and marks the Appointment 'Completed'.
export const submitConsultation = async (req, res) => {
  try {
    const {
      appointmentId,
      patientId,
      vitals,
      chiefComplaints,
      medicalHistory,
      clinicalObservations,
      diagnosis,
      clinicalNotes,
      medications,
      investigationAdvice,
      referral,
      followUpDate,
      status = 'Finalized',
    } = req.body;

    if (!appointmentId) {
      return res.status(400).json({ message: 'Appointment ID is required.' });
    }

    // Verify appointment exists
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found.' });
    }

    const doctorId = req.user._id;
    const facilityId = req.user.hospitalId || appointment.facilityId;
    const targetPatientId = patientId || appointment.patientId;

    if (!targetPatientId) {
      return res.status(400).json({ message: 'Patient reference is required.' });
    }

    // Format medications array safely
    const formattedMedications = Array.isArray(medications)
      ? medications.map((m) => ({
          drugName:     m.drugName || m.medicineName || 'Unnamed Medicine',
          medicineName: m.medicineName || m.drugName || 'Unnamed Medicine',
          dosage:       m.dosage?.trim() || undefined,
          frequency:    m.frequency?.trim() || undefined,
          durationDays: m.durationDays ? Number(m.durationDays) : undefined,
          instructions: m.instructions?.trim() || undefined,
        }))
      : [];

    // Format investigationAdvice array safely
    const formattedInvestigations = Array.isArray(investigationAdvice)
      ? investigationAdvice.map((inv) => ({
          testName: typeof inv === 'string' ? inv.trim() : inv.testName?.trim() || 'Laboratory Test',
          notes:    typeof inv === 'object' ? inv.notes?.trim() : undefined,
          status:   'Ordered',
        }))
      : [];

    // Create the Consultation record
    const consultation = await Consultation.create({
      appointmentId,
      appointment: appointmentId, // backward compat
      patientId:   targetPatientId,
      doctorId,
      doctor:      doctorId,      // backward compat
      facilityId,
      hospital:    facilityId,    // backward compat
      vitals:      vitals || {},
      chiefComplaints: chiefComplaints || appointment.chiefComplaint || '',
      medicalHistory:  medicalHistory || '',
      clinicalObservations: clinicalObservations?.trim() || undefined,
      diagnosis: diagnosis?.trim() || undefined,
      clinicalNotes: clinicalNotes?.trim() || undefined,
      medications: formattedMedications,
      prescription: formattedMedications, // backward compat
      investigationAdvice: formattedInvestigations,
      investigationOrders: formattedInvestigations, // backward compat
      referral: referral || undefined,
      followUpDate: followUpDate ? new Date(followUpDate) : undefined,
      status: ['Draft', 'Finalized'].includes(status) ? status : 'Finalized',
    });

    // Populate patient & doctor references on the returned consultation
    await consultation.populate([
      { path: 'patientId', select: 'firstName lastName contactPhone gender dob abhaId' },
      { path: 'doctorId',  select: 'name email' },
      { path: 'facilityId', select: 'hospitalName' },
    ]);

    // Update the associated Appointment status to 'Completed' (Prompt 5.2 requirement)
    appointment.status = 'Completed';
    await appointment.save();

    res.status(201).json({
      message: 'Consultation saved successfully and appointment marked Completed.',
      consultation,
      appointment,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── getPatientHistory (Prompt 7.2) ───────────────────────────────────────────
// @route   GET /api/doctor/history/:patientId
// @route   GET /api/doctor/patient/:patientId/history
// @access  Private (Doctor)
// Aggregates past Consultations, Prescriptions, LabOrders, and Vitals across any facility.
export const getPatientHistory = async (req, res) => {
  try {
    const { patientId } = req.params;

    const patient = await Patient.findById(patientId).lean();
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found.' });
    }

    const [consultations, prescriptions, labOrders, vitals] = await Promise.all([
      Consultation.find({ patientId })
        .populate('doctorId', 'name email')
        .populate('facilityId', 'hospitalName address')
        .sort({ createdAt: -1 })
        .lean(),
      Prescription.find({ patientId })
        .populate('doctorId', 'name email')
        .sort({ createdAt: -1 })
        .lean(),
      LabOrder.find({ patientId })
        .populate('doctorId', 'name')
        .populate('facilityId', 'hospitalName')
        .sort({ createdAt: -1 })
        .lean(),
      Vitals.find({ patientId })
        .populate('nurseId', 'name')
        .populate('facilityId', 'hospitalName')
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    res.status(200).json({
      success: true,
      patient,
      consultations,
      prescriptions,
      labOrders,
      vitals,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── requestLabTest (Prompt 11.1) ──────────────────────────────────────────────
// @route   POST /api/doctor/lab-test
// @access  Private (Doctor)
// Creates LabOrders with status 'Requested' for multiple tests and moves Appointment to 'Lab Pending'
export const requestLabTest = async (req, res) => {
  try {
    const { appointmentId, patientId, testName, testNames, notes } = req.body;

    // Support both testNames (Array of Strings) and testName (single String)
    let rawTests = [];
    if (Array.isArray(testNames)) {
      rawTests = testNames;
    } else if (typeof testNames === 'string' && testNames.trim()) {
      rawTests = [testNames];
    } else if (typeof testName === 'string' && testName.trim()) {
      rawTests = [testName];
    }

    const cleanTestNames = rawTests
      .map((t) => (typeof t === 'string' ? t.trim() : ''))
      .filter(Boolean);

    if (!appointmentId || cleanTestNames.length === 0) {
      return res.status(400).json({
        message: 'Appointment ID and at least one valid test name are required.',
      });
    }

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found.' });
    }

    const targetPatientId = patientId || appointment.patientId;
    const doctorId = req.user._id;
    const facilityId = req.user.hospitalId || appointment.facilityId;
    const trimmedNotes = notes?.trim() || '';

    // 1. Create separate LabOrder documents using insertMany (Prompt 11.1)
    const labOrdersToInsert = cleanTestNames.map((name) => ({
      appointmentId,
      patientId: targetPatientId,
      doctorId,
      facilityId,
      testName: name,
      status: 'Requested',
      notes: trimmedNotes,
    }));

    const labOrders = await LabOrder.insertMany(labOrdersToInsert);

    // 2. Update Appointment status to 'Lab Pending' (routes it back to Nurse / Lab queue)
    appointment.status = 'Lab Pending';
    if (!appointment.investigationAdvice) {
      appointment.investigationAdvice = [];
    }

    const now = new Date();
    cleanTestNames.forEach((name) => {
      appointment.investigationAdvice.push({
        testName: name,
        notes: trimmedNotes,
        status: 'Ordered',
        orderedAt: now,
      });
    });

    await appointment.save();

    // 3. Sync with LabInvestigationOrder for cross-module compatibility
    try {
      const syncOrders = cleanTestNames.map((name) => ({
        consultation: appointment._id,
        patient: targetPatientId,
        orderedBy: doctorId,
        hospital: facilityId,
        testName: name,
        status: 'Ordered',
      }));
      await LabInvestigationOrder.insertMany(syncOrders);
    } catch {
      // Non-blocking fallback
    }

    res.status(201).json({
      success: true,
      message: `Successfully requested ${labOrders.length} lab test(s). Patient status updated to Lab Pending.`,
      labOrders,
      labOrder: labOrders[0] || null, // Backwards compatibility for single-order consumers
      appointment,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── closeConsultation (Prompt 7.2) ───────────────────────────────────────────
// @route   POST /api/doctor/consultation/close
// @access  Private (Doctor)
// Saves Consultation and Prescription, and marks Appointment 'Completed'
export const closeConsultation = async (req, res) => {
  try {
    const {
      appointmentId,
      patientId,
      chiefComplaint,
      chiefComplaints,
      diagnosis,
      notes,
      clinicalNotes,
      vitals,
      medications,
      instructions,
      medicalHistory,
      followUpDate,
    } = req.body;

    if (!appointmentId) {
      return res.status(400).json({ message: 'Appointment ID is required.' });
    }

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found.' });
    }

    const doctorId = req.user._id;
    const facilityId = req.user.hospitalId || appointment.facilityId;
    const targetPatientId = patientId || appointment.patientId;

    const resolvedChiefComplaint = (chiefComplaint || chiefComplaints || appointment.chiefComplaint || '').trim();
    const resolvedNotes = (notes || clinicalNotes || '').trim();
    const resolvedDiagnosis = (diagnosis || '').trim();

    // Format medications array safely for both Consultation & Prescription models
    const formattedMedications = Array.isArray(medications)
      ? medications
          .filter((m) => m && (m.medicineName?.trim() || m.drugName?.trim()))
          .map((m) => ({
            medicineName: (m.medicineName || m.drugName || '').trim(),
            drugName:     (m.medicineName || m.drugName || '').trim(),
            dosage:       m.dosage?.trim() || '',
            frequency:    m.frequency?.trim() || '',
            duration:     m.duration?.trim() || (m.durationDays ? `${m.durationDays} days` : ''),
            durationDays: m.durationDays ? Number(m.durationDays) : undefined,
            instructions: m.instructions?.trim() || '',
          }))
      : [];

    // 1. Create Consultation record with status 'Closed' (Prompt 7.1 & 7.2)
    const consultation = await Consultation.create({
      appointmentId,
      appointment: appointmentId,
      patientId: targetPatientId,
      doctorId,
      doctor: doctorId,
      facilityId,
      hospital: facilityId,
      chiefComplaint: resolvedChiefComplaint,
      chiefComplaints: resolvedChiefComplaint,
      diagnosis: resolvedDiagnosis,
      notes: resolvedNotes,
      clinicalNotes: resolvedNotes,
      medicalHistory: medicalHistory || '',
      vitals: vitals || appointment.vitals || {},
      medications: formattedMedications,
      prescription: formattedMedications,
      followUpDate: followUpDate ? new Date(followUpDate) : undefined,
      status: 'Closed',
    });

    // 2. Create Prescription record if medications/instructions are present
    let prescription = null;
    if (formattedMedications.length > 0 || instructions?.trim()) {
      prescription = await Prescription.create({
        consultationId: consultation._id,
        patientId: targetPatientId,
        doctorId,
        facilityId,
        hospital: facilityId,
        status: 'Pending',
        medications: formattedMedications,
        instructions: instructions?.trim() || '',
      });
    }

    // 3. Mark Appointment as 'Completed'
    appointment.status = 'Completed';
    await appointment.save();

    res.status(201).json({
      success: true,
      message: 'Consultation closed and prescription created successfully.',
      consultation,
      prescription,
      appointment,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
