import express from 'express';
import { staffLogin } from '../controllers/staffAuthController.js';
import { loginPatient, registerPatient } from '../controllers/patientController.js';
import {
  staffForgotPassword,
  staffResetPassword,
  verifyAndResetPatientPin,
  changeTemporaryPin,
} from '../controllers/authController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();

// POST /api/auth/staff-login
// Unified login for all hospital staff roles (HospitalAdmin, Doctor, ASHA, LabHead, FacilityAdmin, Receptionist)
router.post('/staff-login', staffLogin);

// POST /api/auth/staff/forgot-password & PATCH /api/auth/staff/reset-password/:token
router.post('/staff/forgot-password', staffForgotPassword);
router.patch('/staff/reset-password/:token', staffResetPassword);

// POST /api/auth/patient/login & /api/auth/patient/register (Prompt 7.1)
// Patient PIN authentication endpoints
router.post('/patient/login', loginPatient);
router.post('/patient/register', registerPatient);

// PATCH /api/auth/patient/:id/verify-and-reset-pin (3-Step Security Gate)
router.patch(
  '/patient/:id/verify-and-reset-pin',
  protect,
  authorize('Receptionist', 'HospitalAdmin', 'Admin', 'FacilityAdmin'),
  verifyAndResetPatientPin
);

// PATCH /api/auth/patient/change-temporary-pin (First-Use Block permanent PIN change)
router.patch('/patient/change-temporary-pin', protect, changeTemporaryPin);

export default router;
