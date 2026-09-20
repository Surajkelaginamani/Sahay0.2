import express from 'express';
import { protect, authorize } from '../middlewares/authMiddleware.js';
import {
  createReferral,
  getMyReferrals,
  getHigherLevelHospitals,
  searchPatients,
} from '../modules/asha/ashaController.js';

const router = express.Router();

// ── Hospital & Patient lookup routes for referral creation & teleconsult ──────
router.get(
  '/hospitals',
  protect,
  authorize('ASHA', 'AshaWorker', 'Nurse', 'Patient', 'Receptionist', 'Doctor', 'HospitalAdmin'),
  getHigherLevelHospitals
);
router.get(
  '/patients/search',
  protect,
  authorize('ASHA', 'AshaWorker', 'Nurse', 'Patient', 'Receptionist', 'Doctor', 'HospitalAdmin'),
  searchPatients
);

// ── Shared Referral routes (Prompt 15.1) ──────────────────────────────────────
router.post('/', protect, authorize('ASHA', 'AshaWorker', 'Nurse', 'Doctor'), createReferral);
router.get('/', protect, authorize('ASHA', 'AshaWorker', 'Nurse', 'Doctor'), getMyReferrals);

// ── Inbound Emergency Transfers / District Referral Inbox ───────────────────
router.get('/inbound', async (req, res) => {
  try {
    const Referral = (await import('../models/Referral.js')).default;
    const Appointment = (await import('../models/Appointment.js')).default;

    // Check for explicit Inbound_Referral appointments or pending emergency transfers
    const [appts, referrals] = await Promise.all([
      Appointment.find({
        status: { $in: ['Inbound_Referral', 'Pending Referral', 'Emergency Transfer'] },
      })
        .populate('patientId')
        .populate('hospitalId', 'hospitalName')
        .sort({ createdAt: -1 })
        .lean(),
      Referral.find({ status: { $in: ['Pending', 'Inbound_Referral'] } })
        .populate('patientId')
        .populate('referredFromFacility', 'hospitalName')
        .populate('referredBy', 'name')
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    const combined = [...appts, ...referrals];
    return res.status(200).json({
      success: true,
      count: combined.length,
      referrals: combined,
    });
  } catch (err) {
    console.error('Error fetching inbound referrals:', err.message);
    return res.status(200).json({ success: true, count: 0, referrals: [] });
  }
});

export default router;
