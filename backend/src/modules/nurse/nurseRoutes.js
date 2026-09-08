import express from 'express';
import { protect, authorize } from '../../middlewares/authMiddleware.js';
import {
  getTriageQueue,
  captureVitals,
  getLabQueue,
  forwardToLab,
  notifyDoctor,
} from './nurseController.js';

const router = express.Router();

// All nurse routes require a valid JWT + Nurse role
router.use(protect, authorize('Nurse'));

// ── Triage Queue routes ───────────────────────────────────────────────────────
// GET  /api/nurse/queue         → active triage patients ('At Triage' / 'CheckedIn')
// GET  /api/nurse/triage/queue  → alias
router.get('/queue',        getTriageQueue);
router.get('/triage/queue', getTriageQueue);

// ── Vitals capture routes ─────────────────────────────────────────────────────
// POST /api/nurse/vitals          → capture vitals and push to 'Waiting for Doctor'
// POST /api/nurse/capture-vitals  → alias
router.post('/vitals',         captureVitals);
router.post('/capture-vitals', captureVitals);

// ── Lab Coordination routes (Prompt 8.2) ──────────────────────────────────────
// GET  /api/nurse/lab-queue      → patients in 'Lab Pending' or 'Reports Ready'
router.get('/lab-queue', getLabQueue);

// POST /api/nurse/forward-to-lab → acknowledge forward to lab
router.post('/forward-to-lab', forwardToLab);

// POST /api/nurse/notify-doctor  → notify doctor and set doctorQueueType: 'Review'
router.post('/notify-doctor', notifyDoctor);

export default router;
