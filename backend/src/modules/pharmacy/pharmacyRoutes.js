import express from 'express';
import { protect, authorize } from '../../middlewares/authMiddleware.js';
import {
  getActivePrescriptions,
  dispenseMedication,
  getInventory,
  updateMedicineStock,
  addMedicine,
} from './pharmacyController.js';

const router = express.Router();

// All pharmacy routes require a valid JWT with Pharmacist role
router.use(protect, authorize('Pharmacist'));

// ── Prescription Queue routes (Prompt 9.1) ───────────────────────────────────
// GET /api/pharmacy/prescriptions  → active pending prescriptions
// GET /api/pharmacy                → alias
router.get('/prescriptions', getActivePrescriptions);
router.get('/',              getActivePrescriptions);

// ── Dispensing routes (Prompt 8.1 & 9.1) ─────────────────────────────────────
// PATCH /api/pharmacy/prescriptions/:id/dispense → mark dispensed & deduct inventory
// POST  /api/pharmacy/dispense                   → alias
router.patch('/prescriptions/:id/dispense', dispenseMedication);
router.post('/dispense',                    dispenseMedication);

// ── Inventory routes (Prompt 8.1 & 8.2) ──────────────────────────────────────
// GET   /api/pharmacy/inventory            → get medication stock levels & alerts
// POST  /api/pharmacy/inventory            → add or create medication
// PATCH /api/pharmacy/inventory/:id/stock  → update/restock medicine quantity
router.get('/inventory',            getInventory);
router.post('/inventory',           addMedicine);
router.patch('/inventory/:id/stock', updateMedicineStock);

export default router;
