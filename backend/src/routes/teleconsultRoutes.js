import express from 'express';
import { protect, authorize } from '../middlewares/authMiddleware.js';
import { bookTeleconsult, getMyTeleconsults } from '../controllers/appointmentController.js';
import { getPendingTeleconsults, confirmTeleconsult } from '../modules/receptionist/receptionistController.js';
import { getHigherLevelHospitals, searchPatients } from '../modules/asha/ashaController.js';

const router = express.Router();

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

// ── Book Teleconsult (ASHA, Nurse, Patient) ────────────────────────────────────
// POST /api/teleconsult/book → submit a teleconsult request for hospital review
router.post(
  '/book',
  protect,
  authorize('ASHA', 'AshaWorker', 'Nurse', 'Patient'),
  bookTeleconsult
);

// ── My Teleconsults (Prompt 17.4) ─────────────────────────────────────────────
// GET /api/teleconsult/my → list all teleconsults booked by this worker/patient
router.get(
  '/my',
  protect,
  authorize('ASHA', 'AshaWorker', 'Nurse', 'Patient'),
  getMyTeleconsults
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

