import express from 'express';
import { protect, authorize } from '../../middlewares/authMiddleware.js';
import {
  registerPatient,
  searchPatients,
  createAppointment,
  checkInPatient,
  getTodayQueue,
  addToQueue,
  getFacilityPatients,
  getFacilityDoctors,
  scheduleAppointment,
  getUpcomingAppointments,
  getIncomingReferrals,
  getPendingTeleconsults,
  confirmTeleconsult,
} from './receptionistController.js';

const router = express.Router();

// All receptionist routes require a valid JWT + Receptionist role
router.use(protect, authorize('Receptionist'));

// ── Patient routes ────────────────────────────────────────────────────────────
// POST   /api/receptionist/patient          → register a new walk-in patient
// GET    /api/receptionist/patient/search   → search by name or phone (?q=...)
// GET    /api/receptionist/patients         → all patients who visited this facility (?today=true)
router.post('/patient',          registerPatient);
router.get('/patient/search',    searchPatients);
router.get('/patients',          getFacilityPatients);

// ── Appointment routes ────────────────────────────────────────────────────────
// GET    /api/receptionist/appointments/upcoming       → all future appointments (> end of today)
// POST   /api/receptionist/appointment/schedule        → book a FUTURE appointment (status: Scheduled)
//        NOTE: /appointment/schedule MUST be registered BEFORE /appointment/:id/checkin to avoid clash
// POST   /api/receptionist/appointment                 → generic create appointment
// PATCH  /api/receptionist/appointment/:id/checkin    → check in, assign queue number
router.get('/appointments/upcoming',           getUpcomingAppointments);
router.get('/appointment/upcoming',            getUpcomingAppointments);
router.post('/appointment/schedule',           scheduleAppointment);
router.post('/appointment',                    createAppointment);
router.patch('/appointment/:id/checkin',       checkInPatient);

// ── Doctor routes ─────────────────────────────────────────────────────────────
// GET    /api/receptionist/doctors          → all doctors at this facility
router.get('/doctors', getFacilityDoctors);

// ── Queue routes ──────────────────────────────────────────────────────────────
// POST   /api/receptionist/queue            → add existing patient to today's queue (needs assignedDoctorId + optional priority)
// GET    /api/receptionist/queue/today      → today's full queue (optional ?status=)
router.post('/queue',        addToQueue);
router.get('/queue/today',   getTodayQueue);

// ── Referral routes ───────────────────────────────────────────────────────────
// GET    /api/receptionist/referrals/incoming  → all pending ASHA referrals to this facility
router.get('/referrals/incoming', getIncomingReferrals);

// ── Teleconsult Triage routes (Prompt 17.1) ───────────────────────────────────
// GET    /api/receptionist/teleconsults/pending   → all Teleconsult Requested at this facility
// POST   /api/receptionist/teleconsults/confirm   → assign doctor, generate room, mark Teleconsult Scheduled
router.get('/teleconsults/pending',  getPendingTeleconsults);
router.post('/teleconsults/confirm', confirmTeleconsult);

export default router;
