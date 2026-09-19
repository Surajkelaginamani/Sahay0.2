import express from 'express';
import { registerPatient, loginPatient, getMyMedicalRecords, syncPatient, updatePatientAllergies } from '../controllers/patientController.js';
import { protect } from '../middlewares/authMiddleware.js';

import { changeTemporaryPin } from '../controllers/authController.js';

const router = express.Router();

router.post('/register', registerPatient);
router.post('/login', loginPatient);

// Offline ASHA sync with duplicate detection (Prompt 2.1)
router.post('/sync', syncPatient);

// Protected patient medical records (Prompt 9.3)
router.get('/my-records', protect, getMyMedicalRecords);

// Clinical Allergies Management (Prompt 5.1)
router.patch('/:id/allergies', protect, updatePatientAllergies);

// Change temporary PIN (Prompt: Auth Recovery)
router.patch('/change-temporary-pin', protect, changeTemporaryPin);

export default router;

