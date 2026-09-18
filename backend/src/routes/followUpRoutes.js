import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import {
  scheduleFollowUp,
  getAshaFollowUps,
  updateFollowUpStatus,
  getPatientFollowUps,
} from '../controllers/followUpController.js';

const router = express.Router();

// ── Protected routes ──────────────────────────────────────────────────────────
// POST  /api/follow-ups/schedule       → schedule a follow-up
// GET   /api/follow-ups/asha/:ashaId   → get pending scheduled field tasks for ASHA
// PATCH /api/follow-ups/:id/status     → update status (e.g. ASHA_REMINDED)
// GET   /api/follow-ups/patient/:patientId → get scheduled follow-ups for patient
// GET   /api/follow-ups/my             → get current authenticated citizen's follow-ups
router.post('/schedule', protect, scheduleFollowUp);
router.get('/asha/:ashaId', protect, getAshaFollowUps);
router.patch('/:id/status', protect, updateFollowUpStatus);
router.get('/patient/:patientId', protect, getPatientFollowUps);
router.get('/my', protect, getPatientFollowUps);

export default router;
