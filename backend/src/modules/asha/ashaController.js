import Hospital from '../../models/Hospital.js';
import Referral from '../../models/Referral.js';
import Patient  from '../../models/Patient.js';

// ─── getHigherLevelHospitals ──────────────────────────────────────────────────
// @route   GET /api/asha/hospitals
// @access  Private (ASHA, AshaWorker)
// Returns all approved hospitals that the ASHA worker can refer patients to.
// Excludes the ASHA's own attached hospital so they don't self-refer.
export const getHigherLevelHospitals = async (req, res) => {
  try {
    const ashaHospitalId = req.user.hospitalId; // may be null if freelance ASHA

    const filter = { verificationStatus: 'approved' };

    // Exclude ASHA's own PHC/sub-centre if they have one assigned
    if (ashaHospitalId) {
      filter._id = { $ne: ashaHospitalId };
    }

    const hospitals = await Hospital.find(filter)
      .select('_id hospitalName address contactPhone')
      .sort({ hospitalName: 1 })
      .lean();

    res.json({ count: hospitals.length, hospitals });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── searchPatients ────────────────────────────────────────────────────────────
// @route   GET /api/asha/patients/search?q=<name|phone>
// @access  Private (ASHA, AshaWorker)
// Searches all patients system-wide by name, phone number, or ABHA ID.
export const searchPatients = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length < 2) {
      return res.json({ count: 0, patients: [] });
    }

    const term = q.trim();
    const isPhone = /^\d+$/.test(term);
    const tokens = term.split(/\s+/).filter(Boolean);

    let filter;
    if (isPhone) {
      filter = { contactPhone: { $regex: term, $options: 'i' } };
    } else if (tokens.length > 1) {
      filter = {
        $or: [
          {
            $and: [
              { firstName: { $regex: tokens[0], $options: 'i' } },
              { lastName:  { $regex: tokens[1], $options: 'i' } },
            ],
          },
          {
            $and: [
              { firstName: { $regex: tokens[1], $options: 'i' } },
              { lastName:  { $regex: tokens[0], $options: 'i' } },
            ],
          },
          { firstName: { $regex: term, $options: 'i' } },
          { lastName:  { $regex: term, $options: 'i' } },
          { abhaId:    { $regex: term, $options: 'i' } },
        ],
      };
    } else {
      filter = {
        $or: [
          { firstName: { $regex: term, $options: 'i' } },
          { lastName:  { $regex: term, $options: 'i' } },
          { contactPhone: { $regex: term, $options: 'i' } },
          { abhaId:    { $regex: term, $options: 'i' } },
        ],
      };
    }

    const patients = await Patient.find(filter)
      .select('firstName lastName dob gender contactPhone abhaId')
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    res.json({
      count: patients.length,
      patients: patients.map((p) => ({
        ...p,
        fullName: `${p.firstName || ''} ${p.lastName || ''}`.trim() || 'Unnamed Citizen',
      })),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── createReferral ───────────────────────────────────────────────────────────
// @route   POST /api/asha/referral
// @access  Private (ASHA, AshaWorker)
// Body:    { patientId, referredToFacility, reasonForReferral, clinicalNotes? }
export const createReferral = async (req, res) => {
  try {
    const { patientId, referredToFacility, reasonForReferral, clinicalNotes } = req.body;

    // ── Required field validation ──────────────────────────────────────────────
    if (!patientId || !referredToFacility || !reasonForReferral) {
      return res.status(400).json({
        message: 'patientId, referredToFacility, and reasonForReferral are required.',
      });
    }

    // ── Verify patient exists ──────────────────────────────────────────────────
    const patient = await Patient.findById(patientId).select('firstName lastName contactPhone');
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found.' });
    }

    // ── Verify destination hospital exists ─────────────────────────────────────
    const hospital = await Hospital.findOne({
      _id: referredToFacility,
      verificationStatus: 'approved',
    }).select('hospitalName');
    if (!hospital) {
      return res.status(404).json({ message: 'Destination hospital not found or not approved.' });
    }

    // ── Check for an existing pending referral to the same hospital ────────────
    const existing = await Referral.findOne({
      patientId,
      referredToFacility,
      status: 'Pending',
    });
    if (existing) {
      return res.status(400).json({
        message: `A pending referral for this patient to ${hospital.hospitalName} already exists.`,
        referralId: existing._id,
      });
    }

    // ── Create referral ────────────────────────────────────────────────────────
    const referral = await Referral.create({
      patientId,
      referredBy:          req.user._id,
      referredToFacility,
      referredFromFacility: req.user.hospitalId || null,
      reasonForReferral:   reasonForReferral.trim(),
      clinicalNotes:       clinicalNotes?.trim() || '',
      status:              'Pending',
    });

    await referral.populate([
      { path: 'patientId',            select: 'firstName lastName contactPhone' },
      { path: 'referredToFacility',   select: 'name hospitalName address' },
      { path: 'referredFromFacility', select: 'name hospitalName address city' },
      { path: 'referredBy',           select: 'name firstName lastName role' },
    ]);

    res.status(201).json({
      message: `Referral created for ${patient.firstName} ${patient.lastName} → ${hospital.hospitalName}.`,
      referral,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── getMyReferrals ───────────────────────────────────────────────────────────
// @route   GET /api/asha/referrals
// @access  Private (ASHA, AshaWorker)
// Returns all referrals created by the logged-in ASHA worker,
// optionally filtered by status: ?status=Pending|Arrived|Completed
export const getMyReferrals = async (req, res) => {
  try {
    const filter = { referredBy: req.user._id };

    const { status } = req.query;
    if (status && ['Pending', 'Arrived', 'Completed'].includes(status)) {
      filter.status = status;
    }

    const referrals = await Referral.find(filter)
      .populate('patientId',          'firstName lastName contactPhone gender dob')
      .populate('referredToFacility', 'hospitalName address')
      .sort({ createdAt: -1 })
      .lean();

    const enriched = referrals.map((r) => ({
      ...r,
      patientFullName: r.patientId
        ? `${r.patientId.firstName} ${r.patientId.lastName}`
        : 'Unknown',
    }));

    res.json({ count: enriched.length, referrals: enriched });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
