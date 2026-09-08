import express from 'express';
import { protect, authorize } from '../../middlewares/authMiddleware.js';
import {
  getHigherLevelHospitals,
  searchPatients,
  createReferral,
  getMyReferrals,
} from './ashaController.js';

const router = express.Router();

// All ASHA routes require a valid JWT + ASHA or AshaWorker role
router.use(protect, authorize('ASHA', 'AshaWorker'));

// ── Hospital routes ───────────────────────────────────────────────────────────
// GET  /api/asha/hospitals           → list approved hospitals to refer to
router.get('/hospitals', getHigherLevelHospitals);

// ── Patient routes ────────────────────────────────────────────────────────────
// GET  /api/asha/patients/search     → search all patients by name or phone (?q=...)
router.get('/patients/search', searchPatients);

// ── Referral routes ───────────────────────────────────────────────────────────
// POST /api/asha/referral            → create a new referral
// GET  /api/asha/referrals           → get this ASHA worker's referrals (?status=Pending)
router.post('/referral',  createReferral);
router.get('/referrals',  getMyReferrals);

export default router;
