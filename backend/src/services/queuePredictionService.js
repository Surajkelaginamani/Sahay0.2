/**
 * Queue Prediction Service (plans.md - AI Queue Prediction)
 * Computes real-time estimated wait time for a patient in the OPD queue.
 */

import Appointment from '../models/Appointment.js';

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfToday() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * @param {string} appointmentId  The target patient appointment _id
 * @returns {Object}              queueData payload matching plans.md spec
 */
export async function calculateEstimatedWaitTime(appointmentId) {
  // 1. Find target appointment
  const target = await Appointment.findById(appointmentId)
    .populate('assignedDoctorId', 'name _id')
    .lean();

  if (!target) {
    throw new Error('Appointment not found.');
  }

  const doctorId   = target.assignedDoctorId?._id || target.assignedDoctorId;
  const doctorName = target.assignedDoctorId?.name || 'Doctor';

  // 2. Calculate Doctor Velocity
  // Last 5 completed consultations today that have timing data
  const completedToday = await Appointment.find({
    assignedDoctorId: doctorId,
    status: 'Completed',
    consultationStartTime: {
      $ne: null,
      $gte: startOfToday(),
      $lte: endOfToday(),
    },
    consultationEndTime: { $ne: null },
  })
    .sort({ consultationEndTime: -1 })
    .limit(5)
    .select('consultationStartTime consultationEndTime')
    .lean();

  let doctorVelocity = 7; // default minutes per patient
  if (completedToday.length >= 3) {
    const totalMins = completedToday.reduce((sum, appt) => {
      const diffMs = new Date(appt.consultationEndTime) - new Date(appt.consultationStartTime);
      return sum + diffMs / 60000;
    }, 0);
    doctorVelocity = Math.max(1, Math.round(totalMins / completedToday.length));
  }

  // 3. Evaluate Queue Ahead
  const activeStatuses = ['Waiting for Doctor', 'Waiting', 'CheckedIn', 'In Consultation'];

  const allActive = await Appointment.find({
    assignedDoctorId: doctorId,
    status: { $in: activeStatuses },
    facilityId: target.facilityId,
    appointmentDate: { $gte: startOfToday(), $lte: endOfToday() },
  })
    .sort({ queueNumber: 1, createdAt: 1 })
    .select('queueNumber priority urgency status createdAt _id')
    .lean();

  const targetQueueNumber = target.queueNumber ?? Infinity;

  const patientsAheadList = allActive.filter((a) => {
    if (a.status === 'In Consultation') return true;
    if (a._id.toString() === appointmentId) return false;
    const qn = a.queueNumber ?? Infinity;
    return qn < targetQueueNumber;
  });

  // Skipped patients: each adds a 3-minute buffer
  const skippedCount = await Appointment.countDocuments({
    assignedDoctorId: doctorId,
    facilityId: target.facilityId,
    status: 'Skipped',
    appointmentDate: { $gte: startOfToday(), $lte: endOfToday() },
  });

  // 4. Compute estimated wait time
  let estimatedWaitMinutes = 0;
  for (const p of patientsAheadList) {
    const urg = p.urgency || p.priority || 'Routine';
    if (urg === 'Emergency') {
      estimatedWaitMinutes += doctorVelocity * 1.5;
    } else if (urg === 'Urgent') {
      estimatedWaitMinutes += doctorVelocity * 1.2;
    } else {
      estimatedWaitMinutes += doctorVelocity * 1.0;
    }
  }

  // 3-min contingency per skipped patient
  estimatedWaitMinutes += skippedCount * 3;
  estimatedWaitMinutes = Math.round(estimatedWaitMinutes);

  // Enforce minimum 2 minutes when next in line
  if (patientsAheadList.length === 0) {
    estimatedWaitMinutes = Math.max(2, estimatedWaitMinutes);
  }

  // 5. Ancillary fields
  const expectedCallTime     = new Date(Date.now() + estimatedWaitMinutes * 60 * 1000);
  const inConsultationPatient = allActive.find((a) => a.status === 'In Consultation');
  const currentServingToken  = inConsultationPatient?.queueNumber ?? null;

  return {
    tokenNumber:          target.queueNumber ?? null,
    currentServingToken,
    patientsAhead:        patientsAheadList.length,
    estimatedWaitMinutes,
    expectedCallTime:     expectedCallTime.toISOString(),
    doctorName,
    status:               target.status,
    doctorVelocity,
  };
}
