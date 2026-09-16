import express from 'express';
import {
  getLabMetrics,
  getTestQueue,
  updateOrderStatus,
  submitReport,
  getPendingTests,
  uploadReport,
  completeLabOrder,
  getLabCatalog,
} from './labController.js';
import { protect, authorize } from '../../middlewares/authMiddleware.js';

const router = express.Router();

// GET /api/labs/catalog or /api/lab/catalog - Public / Authenticated catalog of standardized tests
router.get('/catalog', getLabCatalog);

// Restrict subsequent laboratory routes to authenticated users with LabHead role
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
router.post('/complete-order', completeLabOrder);
router.post('/complete-lab-order', completeLabOrder);

// PUT /api/lab/orders/:id/status - Update status of an order
router.put('/orders/:id/status', updateOrderStatus);

// POST /api/lab/reports - Submit report and mark order completed
router.post('/reports', submitReport);

export default router;
