import mongoose from 'mongoose';
import FollowUp from '../models/FollowUp.js';
import Patient from '../models/Patient.js';
import Referral from '../models/Referral.js';
import User from '../models/User.js';

// ─── scheduleFollowUp ────────────────────────────────────────────────────────
// @desc    Schedule a clinical follow-up for a patient
// @route   POST /api/follow-ups/schedule
// @access  Private (Doctor / Staff)
export const scheduleFollowUp = async (req, res) => {
  try {
    const {
      patientId,
      patientUhid,
      doctorId: bodyDoctorId,
      referringAshaId: bodyAshaId,
      followUpDate,
      instructions,
      facilityId: bodyFacilityId,
      appointmentId,
      consultationId,
    } = req.body;

    if (!patientId) {
      return res.status(400).json({ message: 'patientId is required.' });
    }
    if (!followUpDate) {
      return res.status(400).json({ message: 'followUpDate is required.' });
    }

    const doctorId = bodyDoctorId || req.user?._id;
    if (!doctorId) {
      return res.status(400).json({ message: 'doctorId is required.' });
    }

    // Find patient to resolve UHID and referring ASHA worker
    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found.' });
    }

    const resolvedUhid = patientUhid || patient.uhid || '';

    // Closed-Loop ASHA Routing Logic:
    // 1. Explicit referringAshaId provided in request
    // 2. Patient's registeredByAshaId
    // 3. Most recent Referral referring ASHA
    let resolvedAshaId = bodyAshaId || patient.registeredByAshaId || null;

    if (!resolvedAshaId) {
      const recentReferral = await Referral.findOne({ patientId })
        .sort({ createdAt: -1 })
        .select('referredBy');
      if (recentReferral?.referredBy) {
        resolvedAshaId = recentReferral.referredBy;
      }
    }

    const facilityId = bodyFacilityId || req.user?.hospitalId || patient.registeredAtFacility || null;

    const followUp = await FollowUp.create({
      patientId,
      patientUhid: resolvedUhid,
      doctorId,
      referringAshaId: resolvedAshaId,
      followUpDate: new Date(followUpDate),
      instructions: instructions?.trim() || '',
      status: 'SCHEDULED',
      facilityId,
      appointmentId: appointmentId || null,
      consultationId: consultationId || null,
    });

    await followUp.populate([
      { path: 'patientId', select: 'firstName lastName uhid contactPhone gender dob address' },
      { path: 'doctorId', select: 'name email role' },
      { path: 'referringAshaId', select: 'name email phone' },
      { path: 'facilityId', select: 'hospitalName address' },
    ]);

    res.status(201).json({
      success: true,
      message: 'Follow-up scheduled successfully.',
      followUp,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── getAshaFollowUps ────────────────────────────────────────────────────────
// @desc    Returns all 'SCHEDULED' follow-ups linked to a specific ASHA worker for daily field tasks
// @route   GET /api/follow-ups/asha/:ashaId
// @access  Private (ASHA / Staff)
export const getAshaFollowUps = async (req, res) => {
  try {
    const rawAshaId = req.params.ashaId;
    const resolvedAshaId = (rawAshaId === 'me' || !rawAshaId) ? req.user?._id : rawAshaId;

    if (!resolvedAshaId) {
      return res.status(400).json({ message: 'ASHA worker ID is required.' });
    }

    // Default status is 'SCHEDULED', optionally customizable by query param
    const status = req.query.status || 'SCHEDULED';

    // Find patients registered or referred by this ASHA worker for comprehensive fallback
    const linkedPatients = await Patient.find({ registeredByAshaId: resolvedAshaId }).select('_id');
    const linkedPatientIds = linkedPatients.map((p) => p._id);

    const filter = {
      status,
      $or: [
        { referringAshaId: resolvedAshaId },
        { patientId: { $in: linkedPatientIds } },
      ],
    };

    const followUps = await FollowUp.find(filter)
      .populate('patientId', 'firstName lastName uhid contactPhone gender dob address')
      .populate('doctorId', 'name email role')
      .populate('facilityId', 'hospitalName address')
      .sort({ followUpDate: 1 });

    res.status(200).json({
      success: true,
      count: followUps.length,
      followUps,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── updateFollowUpStatus ────────────────────────────────────────────────────
// @desc    Updates status of a follow-up (e.g. ASHA completes home visit / marks reminded)
// @route   PATCH /api/follow-ups/:id/status
// @access  Private (ASHA / Doctor / Staff)
export const updateFollowUpStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['SCHEDULED', 'ASHA_REMINDED', 'COMPLETED', 'MISSED'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const followUp = await FollowUp.findById(id);
    if (!followUp) {
      return res.status(404).json({ message: 'Follow-up not found.' });
    }

    followUp.status = status;
    if (status === 'ASHA_REMINDED') {
      followUp.remindedAt = new Date();
    } else if (status === 'COMPLETED') {
      followUp.completedAt = new Date();
    }

    await followUp.save();

    await followUp.populate([
      { path: 'patientId', select: 'firstName lastName uhid contactPhone gender dob address' },
      { path: 'doctorId', select: 'name email role' },
      { path: 'referringAshaId', select: 'name email phone' },
      { path: 'facilityId', select: 'hospitalName address' },
    ]);

    res.status(200).json({
      success: true,
      message: `Follow-up status updated to ${status}.`,
      followUp,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── getPatientFollowUps ─────────────────────────────────────────────────────
// @desc    Get upcoming scheduled follow-ups for a patient
// @route   GET /api/follow-ups/patient/:patientId or GET /api/follow-ups/my
// @access  Private (Patient / Authenticated Citizen / Doctor)
export const getPatientFollowUps = async (req, res) => {
  try {
    let targetPatientId = req.params.patientId;

    if (!targetPatientId || targetPatientId === 'my') {
      // Resolve from authenticated user
      const patientDoc = await Patient.findOne({
        $or: [
          { userId: req.user._id },
          { _id: req.user._id },
          { contactPhone: req.user.contactPhone || '___none___' },
        ],
      });
      targetPatientId = patientDoc?._id || req.user._id;
    }

    const followUps = await FollowUp.find({
      patientId: targetPatientId,
      status: { $in: ['SCHEDULED', 'ASHA_REMINDED'] },
    })
      .populate('doctorId', 'name email role')
      .populate('facilityId', 'hospitalName address')
      .sort({ followUpDate: 1 });

    res.status(200).json({
      success: true,
      count: followUps.length,
      upcomingFollowUp: followUps[0] || null,
      followUps,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
