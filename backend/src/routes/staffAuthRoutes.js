import express from 'express';
import { staffLogin } from '../controllers/staffAuthController.js';
import { loginPatient, registerPatient } from '../controllers/patientController.js';

const router = express.Router();

// POST /api/auth/staff-login
// Unified login for all hospital staff roles (HospitalAdmin, Doctor, ASHA, LabHead, FacilityAdmin, Receptionist)
router.post('/staff-login', staffLogin);

// POST /api/auth/patient/login & /api/auth/patient/register (Prompt 7.1)
// Patient PIN authentication endpoints
router.post('/patient/login', loginPatient);
router.post('/patient/register', registerPatient);

export default router;
