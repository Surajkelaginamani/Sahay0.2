import express from 'express';
import { protect, authorize } from '../../middlewares/authMiddleware.js';
import {
  getActivePrescriptions,
  dispenseMedication,
} from './pharmacyController.js';

const router = express.Router();

// All pharmacy routes require a valid JWT with Pharmacist role
router.use(protect, authorize('Pharmacist'));

// ── Prescription Queue routes (Prompt 9.1) ───────────────────────────────────
// GET /api/pharmacy/prescriptions  → active pending prescriptions
// GET /api/pharmacy                → alias
router.get('/prescriptions', getActivePrescriptions);
router.get('/',              getActivePrescriptions);

// ── Dispensing routes ────────────────────────────────────────────────────────
// PATCH /api/pharmacy/prescriptions/:id/dispense → mark dispensed
// POST  /api/pharmacy/dispense                   → alias
router.patch('/prescriptions/:id/dispense', dispenseMedication);
router.post('/dispense',                    dispenseMedication);

export default router;
