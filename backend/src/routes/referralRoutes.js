import express from 'express';
import { protect, authorize } from '../middlewares/authMiddleware.js';
import {
  createReferral,
  getMyReferrals,
  getHigherLevelHospitals,
  searchPatients,
} from '../modules/asha/ashaController.js';

const router = express.Router();

// ── Hospital & Patient lookup routes for referral creation & teleconsult ──────
router.get(
  '/hospitals',
  protect,
  authorize('ASHA', 'AshaWorker', 'Nurse', 'Patient', 'Receptionist', 'Doctor', 'HospitalAdmin'),
  getHigherLevelHospitals
);
router.get(
  '/patients/search',
  protect,
  authorize('ASHA', 'AshaWorker', 'Nurse', 'Patient', 'Receptionist', 'Doctor', 'HospitalAdmin'),
  searchPatients
);

// ── Shared Referral routes (Prompt 15.1) ──────────────────────────────────────
router.post('/', protect, authorize('ASHA', 'AshaWorker', 'Nurse', 'Doctor'), createReferral);
router.get('/', protect, authorize('ASHA', 'AshaWorker', 'Nurse', 'Doctor'), getMyReferrals);

export default router;
