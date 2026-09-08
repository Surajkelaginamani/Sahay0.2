import express from 'express';
import { registerPatient, loginPatient, getMyMedicalRecords } from '../controllers/patientController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/register', registerPatient);
router.post('/login', loginPatient);

// Protected patient medical records (Prompt 9.3)
router.get('/my-records', protect, getMyMedicalRecords);

export default router;

