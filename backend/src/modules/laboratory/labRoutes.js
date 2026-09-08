import express from 'express';
import {
  getLabMetrics,
  getTestQueue,
  updateOrderStatus,
  submitReport,
  getPendingTests,
  uploadReport,
} from './labController.js';
import { protect, authorize } from '../../middlewares/authMiddleware.js';

const router = express.Router();

// Restrict all laboratory routes to authenticated users with LabHead role
router.use(protect, authorize('LabHead'));

// GET /api/lab/metrics - Aggregated metrics grouped by status
router.get('/metrics', getLabMetrics);

// GET /api/lab/queue - Orders queue sorted by date
router.get('/queue', getTestQueue);

// Prompt 8.3: Pending tests & report upload
// GET  /api/lab/pending-tests  - Pending LabOrder tests
router.get('/pending-tests', getPendingTests);

// POST /api/lab/upload-report   - Upload report, complete LabOrder, update Appointment to 'Reports Ready'
router.post('/upload-report', uploadReport);

// PUT /api/lab/orders/:id/status - Update status of an order
router.put('/orders/:id/status', updateOrderStatus);

// POST /api/lab/reports - Submit report and mark order completed
router.post('/reports', submitReport);

export default router;
