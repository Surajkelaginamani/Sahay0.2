import express from 'express';
import { protect } from '../../middlewares/authMiddleware.js';
import { getPatientQueueStatus } from './queueController.js';

const router = express.Router();

// GET /api/queue/patient-status/:appointmentId
// Access: authenticated patients (and staff) - minimal auth required
router.get('/patient-status/:appointmentId', protect, getPatientQueueStatus);

export default router;
