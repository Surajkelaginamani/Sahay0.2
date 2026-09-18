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
  getDoctorsDutyStatus,
  scheduleAppointment,
  getUpcomingAppointments,
  getIncomingReferrals,
  getPendingTeleconsults,
  confirmTeleconsult,
  getPendingConflicts,
  resolveConflict,
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
// GET    /api/reception/doctors-status      → live doctors duty status & activeQueueCount
router.get('/doctors',        getFacilityDoctors);
router.get('/doctors-status', getDoctorsDutyStatus);
router.get('/doctors/status', getDoctorsDutyStatus);

// ── Queue routes ──────────────────────────────────────────────────────────────
// POST   /api/receptionist/queue            → add existing patient to today's queue (needs assignedDoctorId + optional priority)
// GET    /api/receptionist/queue/today      → today's full queue (optional ?status=)
router.post('/queue',        addToQueue);
router.get('/queue/today',   getTodayQueue);

// ── Referral routes ───────────────────────────────────────────────────────────
// GET    /api/receptionist/referrals/incoming  → all pending ASHA referrals to this facility
router.get('/referrals/incoming', getIncomingReferrals);

// GET    /api/receptionist/teleconsults/pending   → all Teleconsult Requested at this facility
// POST   /api/receptionist/teleconsults/confirm   → assign doctor, generate room, mark Teleconsult Confirmed
// PATCH  /api/receptionist/teleconsults/:id/confirm
router.get('/teleconsults/pending',      getPendingTeleconsults);
router.post('/teleconsults/confirm',     confirmTeleconsult);
router.post('/teleconsults/:id/confirm',  confirmTeleconsult);
router.patch('/teleconsults/:id/confirm', confirmTeleconsult);

// ── Data Conflict routes (Prompt 2.2) ─────────────────────────────────────────
// GET  /api/receptionist/conflicts              → list all pending sync conflicts
// POST /api/receptionist/conflicts/:id/resolve  → resolve with 'merge' or 'create_new'
router.get('/conflicts',              getPendingConflicts);
router.post('/conflicts/:id/resolve', resolveConflict);

export default router;
