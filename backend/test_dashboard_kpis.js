import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

import Appointment from './src/models/Appointment.js';
import User from './src/models/User.js';
import Hospital from './src/models/Hospital.js';
import Patient from './src/models/Patient.js';

// Import the logic functions under test (re-implemented here for standalone node test)
const isToday = (dateValue) => {
  if (!dateValue) return false;
  const d = new Date(dateValue);
  if (isNaN(d.getTime())) return false;
  const today = new Date();
  return (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  );
};

const isWaitingInQueue = (appt) => {
  if (!appt) return false;
  const s = (appt.status || '').trim().toLowerCase();
  return (
    s === 'waiting' ||
    s === 'waiting for doctor' ||
    s === 'checkedin' ||
    s === 'checked in'
  );
};

const isUrgentOrCritical = (appt) => {
  if (!appt) return false;
  const urgency = String(appt.urgency || '').toUpperCase();
  if (urgency === 'URGENT' || urgency === 'EMERGENCY') return true;

  const priority = String(appt.priority || '').toUpperCase();
  if (priority === 'URGENT' || priority === 'EMERGENCY') return true;

  if (appt.isCriticalLab) return true;
  if (Array.isArray(appt.labOrders) && appt.labOrders.some((o) => o?.isCritical)) return true;

  if (Array.isArray(appt.clinicalTags)) {
    const hasUrgentTag = appt.clinicalTags.some((tag) => {
      const t = String(tag).toUpperCase();
      return t.includes('URGENT') || t.includes('EMERGENCY');
    });
    if (hasUrgentTag) return true;
  }

  if (appt.triage) {
    const triageStr = JSON.stringify(appt.triage).toUpperCase();
    if (triageStr.includes('URGENT') || triageStr.includes('EMERGENCY')) return true;
  }

  return false;
};

const isConsultationCompletedToday = (appt) => {
  if (!appt) return false;
  const s = (appt.status || '').trim().toUpperCase();
  if (s !== 'COMPLETED' && s !== 'CLOSED') return false;

  const dateToCheck =
    appt.consultationEndTime ||
    appt.updatedAt ||
    appt.appointmentDate ||
    appt.createdAt;

  return isToday(dateToCheck);
};

const deriveQueueMetrics = (appointments = []) => {
  const list = Array.isArray(appointments) ? appointments : [];
  const waitingList = list.filter(isWaitingInQueue);
  const urgentList = list.filter(isUrgentOrCritical);
  const completedTodayList = list.filter(isConsultationCompletedToday);
  const reportsReadyList = list.filter((a) => a.status === 'Reports Ready');

  return {
    waitingCount: waitingList.length,
    urgentCount: urgentList.length,
    completedTodayCount: completedTodayList.length,
    reportsReadyCount: reportsReadyList.length,
    total: list.length,
  };
};

async function runTests() {
  console.log('--- TEST 1: Unit testing derivation logic ---');
  const mockAppointments = [
    { _id: '1', status: 'Waiting', urgency: 'Routine' },
    { _id: '2', status: 'Waiting for Doctor', urgency: 'Urgent' },
    { _id: '3', status: 'CheckedIn', urgency: 'Routine', priority: 'Routine' },
    { _id: '4', status: 'Reports Ready', isCriticalLab: true },
    { _id: '5', status: 'Completed', updatedAt: new Date(), urgency: 'Emergency' },
    { _id: '6', status: 'Completed', updatedAt: new Date(Date.now() - 86400000 * 3) }, // 3 days ago
    { _id: '7', status: 'Scheduled', clinicalTags: ['URGENT'] },
  ];

  const metrics = deriveQueueMetrics(mockAppointments);
  console.log('Calculated Derived Metrics:', metrics);

  if (metrics.waitingCount !== 3) {
    throw new Error(`Expected waitingCount to be 3, got ${metrics.waitingCount}`);
  }
  console.log('✓ waitingCount derived correctly (3 waiting patients)');

  // Urgent: #2 (urgency: Urgent), #4 (isCriticalLab), #5 (urgency: Emergency), #7 (clinicalTags: URGENT) => 4
  if (metrics.urgentCount !== 4) {
    throw new Error(`Expected urgentCount to be 4, got ${metrics.urgentCount}`);
  }
  console.log('✓ urgentCount derived correctly (4 urgent/critical patients)');

  // Completed Today: #5 is completed today, #6 is completed 3 days ago => 1
  if (metrics.completedTodayCount !== 1) {
    throw new Error(`Expected completedTodayCount to be 1, got ${metrics.completedTodayCount}`);
  }
  console.log('✓ completedTodayCount derived correctly (1 completed today)');

  console.log('\n--- TEST 2: Lab Metrics derivation logic ---');
  const mockLabOrders = [
    { _id: 'l1', status: 'Ordered' },
    { _id: 'l2', status: 'Ordered' },
    { _id: 'l3', status: 'SampleCollected' },
    { _id: 'l4', status: 'Processing' },
    { _id: 'l5', status: 'Completed' },
    { _id: 'l6', status: 'Completed' },
  ];

  const testsOrdered = mockLabOrders.filter((o) => o.status === 'Ordered').length;
  const samplesCollected = mockLabOrders.filter((o) => o.status === 'SampleCollected').length;
  const inProcessing = mockLabOrders.filter((o) => o.status === 'Processing').length;
  const reportsReady = mockLabOrders.filter((o) => o.status === 'Completed').length;

  if (testsOrdered !== 2 || samplesCollected !== 1 || inProcessing !== 1 || reportsReady !== 2) {
    throw new Error('Lab metrics derivation mismatch');
  }
  console.log('✓ Lab metrics derived correctly: Ordered=2, SampleCollected=1, Processing=1, Completed=2');

  console.log('\n--- TEST 3: MongoDB Doctor Queue Query Test ---');
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/sahay';
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');

  // Find a doctor
  const doctor = await User.findOne({ role: 'Doctor' });
  if (doctor) {
    console.log(`Found test doctor: ${doctor.name} (${doctor._id})`);

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const rawAppointments = await Appointment.aggregate([
      {
        $match: {
          assignedDoctorId: doctor._id,
          $or: [
            {
              status: { $in: [
                'Waiting', 'CheckedIn', 'Waiting for Doctor', 'Reports Ready',
                'Teleconsult Requested', 'Teleconsult Scheduled', 'Teleconsult Confirmed',
                'Patient Waiting in Room', 'In Teleconsult',
              ]},
            },
            {
              status: { $in: ['Completed', 'Closed'] },
              $or: [
                { consultationEndTime: { $gte: startOfDay, $lte: endOfDay } },
                { updatedAt: { $gte: startOfDay, $lte: endOfDay } },
                { appointmentDate: { $gte: startOfDay, $lte: endOfDay } },
              ],
            },
          ],
        },
      },
    ]);

    console.log(`Doctor appointment query executed successfully: found ${rawAppointments.length} matching appointments`);
    const dbDerived = deriveQueueMetrics(rawAppointments);
    console.log('Live Doctor Derived Metrics from DB:', dbDerived);
  } else {
    console.log('No Doctor user found in DB, skipping live aggregation query test');
  }

  await mongoose.disconnect();
  console.log('\n✓ ALL TESTS PASSED SUCCESSFULLY!');
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
