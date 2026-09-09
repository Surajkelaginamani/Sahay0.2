import express from 'express';
import { protect, authorize } from '../../middlewares/authMiddleware.js';
import {
  getDoctorQueue,
  submitConsultation,
  startAppointment,
  getPatientTimeline,
  getPatientProfile,
  getPatientHistory,
  requestLabTest,
  closeConsultation,
  joinTeleconsult,
} from './doctorController.js';

const router = express.Router();

// All doctor routes require a valid JWT + Doctor role
router.use(protect, authorize('Doctor'));

// ── Queue routes ──────────────────────────────────────────────────────────────
// GET  /api/doctor/queue          → today's waiting/checked-in queue for logged-in doctor
router.get('/queue', getDoctorQueue);

// ── Appointment workflow routes ───────────────────────────────────────────────
// PATCH /api/doctor/appointment/:appointmentId/start → mark appointment CheckedIn/In-Progress
router.patch('/appointment/:appointmentId/start', startAppointment);

// ── Patient history & profile routes ──────────────────────────────────────────
// GET  /api/doctor/history/:patientId                → Prompt 7.2 longitudinal patient history (all facilities)
router.get('/history/:patientId', getPatientHistory);
router.get('/patient/:patientId/history', getPatientHistory); // alias

// GET  /api/doctor/patient/:patientId/timeline       → longitudinal patient history
router.get('/patient/:patientId/timeline', getPatientTimeline);

// GET  /api/doctor/patient/:patientId                → patient demographic profile
router.get('/patient/:patientId', getPatientProfile);

// ── Lab Request routes (Prompt 7.2) ───────────────────────────────────────────
// POST /api/doctor/lab-test                          → order lab test & update status to 'Lab Pending'
router.post('/lab-test', requestLabTest);
router.post('/lab/request', requestLabTest); // alias

// ── Consultation & Prescription routes ────────────────────────────────────────
// POST /api/doctor/consultation/close                → Prompt 7.2 close consultation, create prescription, mark Completed
router.post('/consultation/close', closeConsultation);
router.post('/close-consultation', closeConsultation); // alias

// POST /api/doctor/consultation                      → save ABDM clinical consultation & complete appointment
router.post('/consultation', submitConsultation);

// ── Teleconsultation routes (Prompt 16.1) ─────────────────────────────────────
// POST /api/doctor/teleconsult/join                  → join video teleconsultation room
router.post('/teleconsult/join', joinTeleconsult);
router.post('/join-teleconsult', joinTeleconsult); // alias

export default router;
