import express from 'express';
import { protect, authorize } from '../middlewares/authMiddleware.js';
import {
  bookTeleconsult,
  getMyTeleconsults,
  startTeleconsultWaiting,
  getPatientActiveTodayAppointment,
} from '../controllers/appointmentController.js';
import { getPendingTeleconsults, confirmTeleconsult } from '../modules/receptionist/receptionistController.js';
import { getHigherLevelHospitals, searchPatients } from '../modules/asha/ashaController.js';

const router = express.Router();

// ── Today's Active Patient Appointment for Queue Tracker (Prompt: Mount Live Queue Tracker)
// GET /api/appointments/patient/active-today
router.get(
  '/patient/active-today',
  protect,
  getPatientActiveTodayAppointment
);

// ── Patient & Hospital Search for Teleconsultation (ASHA, Nurse, etc.) ────────
// GET /api/teleconsult/patients/search?q=<name|phone>
router.get(
  '/patients/search',
  protect,
  authorize('ASHA', 'AshaWorker', 'Nurse', 'Receptionist', 'Doctor', 'HospitalAdmin', 'Patient'),
  searchPatients
);

// GET /api/teleconsult/hospitals
router.get(
  '/hospitals',
  protect,
  authorize('ASHA', 'AshaWorker', 'Nurse', 'Patient', 'Receptionist', 'Doctor', 'HospitalAdmin'),
  getHigherLevelHospitals
);

// POST /api/teleconsult/book or /api/appointments/teleconsult → submit a teleconsult request for hospital review
router.post(
  '/book',
  protect,
  authorize('ASHA', 'AshaWorker', 'Nurse', 'Patient'),
  bookTeleconsult
);
router.post(
  '/teleconsult',
  protect,
  authorize('ASHA', 'AshaWorker', 'Nurse', 'Patient'),
  bookTeleconsult
);

// ── My Teleconsults (Prompt 17.4 & 18.2) ──────────────────────────────────────
// GET /api/teleconsult/my → list all teleconsults booked by this worker/patient
router.get(
  '/my',
  protect,
  authorize('ASHA', 'AshaWorker', 'Nurse', 'Patient'),
  getMyTeleconsults
);

// ── Patient/ASHA Check-In & Enter Waiting Room (Prompt 18.1) ─────────────────
// POST /api/teleconsult/:appointmentId/start or .../enter-waiting-room → updates status to 'Patient Waiting in Room'
router.post(
  '/:appointmentId/start',
  protect,
  authorize('ASHA', 'AshaWorker', 'Nurse', 'Patient', 'Doctor', 'HospitalAdmin'),
  startTeleconsultWaiting
);
router.post(
  '/:appointmentId/enter-waiting-room',
  protect,
  authorize('ASHA', 'AshaWorker', 'Nurse', 'Patient', 'Doctor', 'HospitalAdmin'),
  startTeleconsultWaiting
);

// ── Receptionist Triage Endpoints (Prompt 17.1 & 17.3) ────────────────────────
// GET /api/teleconsult/pending → pending teleconsult requests for the receptionist's hospital
router.get(
  '/pending',
  protect,
  authorize('Receptionist', 'HospitalAdmin', 'Doctor'),
  getPendingTeleconsults
);

// POST /api/teleconsult/confirm → receptionist confirms appointment and generates room ID
router.post(
  '/confirm',
  protect,
  authorize('Receptionist', 'HospitalAdmin'),
  confirmTeleconsult
);

export default router;

