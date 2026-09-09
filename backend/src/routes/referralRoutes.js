import express from 'express';
import { protect, authorize } from '../middlewares/authMiddleware.js';
import {
  createReferral,
  getMyReferrals,
  getHigherLevelHospitals,
  searchPatients,
} from '../modules/asha/ashaController.js';

const router = express.Router();

// Allow ASHA and Nurse roles to access referral routes
router.use(protect, authorize('ASHA', 'AshaWorker', 'Nurse'));

// ── Hospital & Patient lookup routes for referral creation ────────────────────
router.get('/hospitals', getHigherLevelHospitals);
router.get('/patients/search', searchPatients);

// ── Shared Referral routes (Prompt 15.1) ──────────────────────────────────────
router.post('/', createReferral);
router.get('/', getMyReferrals);

export default router;
