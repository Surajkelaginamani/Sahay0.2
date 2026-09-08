import Prescription from '../../models/Prescription.js';
import Consultation from '../../models/Consultation.js';

// ─── getActivePrescriptions (Prompt 9.1) ──────────────────────────────────────
// @route   GET /api/pharmacy/prescriptions
// @access  Private (Pharmacist)
// Fetches all pending prescriptions for the logged-in pharmacist's facility.
export const getActivePrescriptions = async (req, res) => {
  try {
    const facilityId = req.user.hospitalId || req.user.facilityId;
    if (!facilityId) {
      return res.status(400).json({ message: 'Pharmacist account is not linked to a facility.' });
    }

    // Query prescriptions that are Pending (or legacy without status) matching facility
    const prescriptions = await Prescription.find({
      $or: [
        { facilityId },
        { hospital: facilityId },
        { facilityId: null }, // Fallback for legacy prescriptions created before facilityId was stored
      ],
      $and: [
        {
          $or: [
            { status: 'Pending' },
            { status: { $exists: false } },
            { status: null },
          ],
        },
      ],
    })
      .populate('patientId', 'firstName lastName contactPhone gender dob abhaId bloodGroup address')
      .populate('doctorId', 'name email specialization')
      .populate('consultationId', 'diagnosis chiefComplaint notes clinicalNotes vitals createdAt')
      .populate('facilityId', 'hospitalName address')
      .sort({ createdAt: -1 })
      .lean();

    // Enrich with computed fields for easy UI rendering
    const enriched = prescriptions.map((rx) => {
      const patient = rx.patientId || {};
      const age = patient.dob
        ? Math.floor((new Date() - new Date(patient.dob)) / (1000 * 60 * 60 * 24 * 365.25))
        : null;

      return {
        ...rx,
        patientFullName: patient.firstName
          ? `${patient.firstName} ${patient.lastName || ''}`.trim()
          : 'Unknown Patient',
        patientAge: age,
        medicationCount: Array.isArray(rx.medications) ? rx.medications.length : 0,
      };
    });

    res.status(200).json({
      success: true,
      count: enriched.length,
      prescriptions: enriched,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── dispenseMedication (Prompt 9.1) ──────────────────────────────────────────
// @route   PATCH /api/pharmacy/prescriptions/:id/dispense
// @route   POST  /api/pharmacy/dispense
// @access  Private (Pharmacist)
// Marks a prescription as 'Dispensed' by the current pharmacist.
export const dispenseMedication = async (req, res) => {
  try {
    const prescriptionId = req.params.id || req.body.prescriptionId;
    if (!prescriptionId) {
      return res.status(400).json({ message: 'Prescription ID is required.' });
    }

    const prescription = await Prescription.findById(prescriptionId);
    if (!prescription) {
      return res.status(404).json({ message: 'Prescription not found.' });
    }

    prescription.status = 'Dispensed';
    prescription.dispensedBy = req.user._id;
    prescription.dispensedAt = new Date();
    await prescription.save();

    await prescription.populate([
      { path: 'patientId', select: 'firstName lastName contactPhone' },
      { path: 'doctorId', select: 'name' },
      { path: 'dispensedBy', select: 'name' },
    ]);

    res.status(200).json({
      success: true,
      message: 'Prescription marked as Dispensed successfully.',
      prescription,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
