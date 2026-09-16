import express from 'express';
import { getPatientInsights } from './aiController.js';
import { protect } from '../../middlewares/authMiddleware.js';

const router = express.Router();

/**
 * @route   GET /api/ai/insights/:patientId
 * @desc    Generate Gemini 1.5 Flash longitudinal clinical insight summary
 * @access  Private (Doctor / Clinical Staff)
 */
router.get('/insights/:patientId', protect, getPatientInsights);

export default router;
