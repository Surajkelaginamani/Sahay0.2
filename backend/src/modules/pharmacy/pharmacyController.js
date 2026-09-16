import Prescription from '../../models/Prescription.js';
import Consultation from '../../models/Consultation.js';
import Medicine from '../../models/Medicine.js';

// Helper to escape regex special characters
function escapeRegex(string) {
  return string.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&');
}

// Initial seed catalog for common medications
const DEFAULT_MEDICINES = [
  { name: 'Paracetamol 500mg', brandName: 'Dolo-650 / Crocin', category: 'Analgesic / Antipyretic', dosage: '500mg', stockQuantity: 250, lowStockThreshold: 50, unit: 'Tablets' },
  { name: 'Amoxicillin 500mg', brandName: 'Mox 500', category: 'Antibiotic', dosage: '500mg', stockQuantity: 120, lowStockThreshold: 50, unit: 'Capsules' },
  { name: 'Cetirizine 10mg', brandName: 'Cetzine', category: 'Antihistamine', dosage: '10mg', stockQuantity: 180, lowStockThreshold: 50, unit: 'Tablets' },
  { name: 'Metformin 500mg', brandName: 'Glycomet', category: 'Antidiabetic', dosage: '500mg', stockQuantity: 35, lowStockThreshold: 50, unit: 'Tablets' },
  { name: 'Omeprazole 20mg', brandName: 'Omez', category: 'Antacid / PPI', dosage: '20mg', stockQuantity: 15, lowStockThreshold: 50, unit: 'Capsules' },
  { name: 'Azithromycin 500mg', brandName: 'Azee 500', category: 'Antibiotic', dosage: '500mg', stockQuantity: 0, lowStockThreshold: 50, unit: 'Tablets' },
  { name: 'Ibuprofen 400mg', brandName: 'Brufen', category: 'NSAID / Analgesic', dosage: '400mg', stockQuantity: 95, lowStockThreshold: 50, unit: 'Tablets' },
  { name: 'Pantoprazole 40mg', brandName: 'Pan 40', category: 'Antacid / PPI', dosage: '40mg', stockQuantity: 80, lowStockThreshold: 50, unit: 'Tablets' },
  { name: 'Atorvastatin 10mg', brandName: 'Atorva', category: 'Cardiovascular', dosage: '10mg', stockQuantity: 65, lowStockThreshold: 50, unit: 'Tablets' },
  { name: 'Amlodipine 5mg', brandName: 'Amlong', category: 'Antihypertensive', dosage: '5mg', stockQuantity: 110, lowStockThreshold: 50, unit: 'Tablets' },
  { name: 'Ciprofloxacin 500mg', brandName: 'Ciplox 500', category: 'Antibiotic', dosage: '500mg', stockQuantity: 0, lowStockThreshold: 50, unit: 'Tablets' },
];

// Helper to seed inventory if empty
const seedInventoryIfEmpty = async () => {
  const count = await Medicine.countDocuments();
  if (count === 0) {
    await Medicine.insertMany(DEFAULT_MEDICINES);
  }
};

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
      .populate('patientId', 'firstName lastName contactPhone gender dob abhaId bloodGroup address uhid')
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
        patientUhid: patient.uhid || null,
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

// ─── getInventory (Prompt 8.1 & 8.2) ──────────────────────────────────────────
// @route   GET /api/pharmacy/inventory
// @access  Private (Pharmacist)
// Fetches full medicine inventory with stockQuantity and lowStockThreshold status
export const getInventory = async (req, res) => {
  try {
    await seedInventoryIfEmpty();

    const medicines = await Medicine.find().sort({ name: 1 }).lean();

    const formattedInventory = medicines.map((item) => ({
      ...item,
      isLowStock: item.stockQuantity <= item.lowStockThreshold && item.stockQuantity > 0,
      isOutOfStock: item.stockQuantity === 0,
      stockStatus:
        item.stockQuantity === 0
          ? 'OUT_OF_STOCK'
          : item.stockQuantity <= item.lowStockThreshold
          ? 'LOW_STOCK'
          : 'IN_STOCK',
    }));

    res.status(200).json({
      success: true,
      count: formattedInventory.length,
      inventory: formattedInventory,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── updateMedicineStock (Prompt 8.1 & 8.2) ──────────────────────────────────
// @route   PATCH /api/pharmacy/inventory/:id/stock
// @access  Private (Pharmacist)
export const updateMedicineStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { stockQuantity, addQuantity, lowStockThreshold } = req.body;

    const medicine = await Medicine.findById(id);
    if (!medicine) {
      return res.status(404).json({ message: 'Medicine not found in inventory.' });
    }

    if (typeof stockQuantity === 'number') {
      medicine.stockQuantity = Math.max(0, stockQuantity);
    } else if (typeof addQuantity === 'number') {
      medicine.stockQuantity = Math.max(0, medicine.stockQuantity + addQuantity);
    }

    if (typeof lowStockThreshold === 'number') {
      medicine.lowStockThreshold = Math.max(0, lowStockThreshold);
    }

    await medicine.save();

    res.status(200).json({
      success: true,
      message: `Stock updated for ${medicine.name}`,
      medicine,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── addMedicine (Prompt 8.1) ────────────────────────────────────────────────
// @route   POST /api/pharmacy/inventory
// @access  Private (Pharmacist)
export const addMedicine = async (req, res) => {
  try {
    const {
      name,
      brandName,
      category,
      dosage,
      stockQuantity,
      lowStockThreshold,
      unit,
      price,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Medicine name is required.' });
    }

    const trimmedName = name.trim();
    let medicine = await Medicine.findOne({
      name: { $regex: new RegExp(`^${escapeRegex(trimmedName)}$`, 'i') },
    });

    if (medicine) {
      // If already exists, increment stock
      if (typeof stockQuantity === 'number') {
        medicine.stockQuantity += stockQuantity;
      }
      if (brandName) medicine.brandName = brandName.trim();
      if (category) medicine.category = category.trim();
      if (dosage) medicine.dosage = dosage.trim();
      if (typeof lowStockThreshold === 'number') medicine.lowStockThreshold = lowStockThreshold;
      if (unit) medicine.unit = unit.trim();
      await medicine.save();
    } else {
      medicine = await Medicine.create({
        name: trimmedName,
        brandName: brandName?.trim() || '',
        category: category?.trim() || 'General',
        dosage: dosage?.trim() || '',
        stockQuantity: typeof stockQuantity === 'number' ? Math.max(0, stockQuantity) : 0,
        lowStockThreshold: typeof lowStockThreshold === 'number' ? Math.max(0, lowStockThreshold) : 50,
        unit: unit?.trim() || 'Tablets',
        price: typeof price === 'number' ? price : 0,
      });
    }

    res.status(201).json({
      success: true,
      message: 'Medicine saved to inventory successfully.',
      medicine,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── dispenseMedication (Prompt 8.1 & 9.1) ────────────────────────────────────
// @route   PATCH /api/pharmacy/prescriptions/:id/dispense
// @route   POST  /api/pharmacy/dispense
// @access  Private (Pharmacist)
// Marks a prescription as 'Dispensed' and decrements medicine stockQuantity.
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

    if (prescription.status === 'Dispensed') {
      return res.status(400).json({ message: 'Prescription has already been dispensed.' });
    }

    // Ensure inventory is seeded if empty
    await seedInventoryIfEmpty();

    const medications = Array.isArray(prescription.medications) ? prescription.medications : [];
    const deductionPlan = [];

    // Step 1: Validation loop across all prescribed medications
    for (const med of medications) {
      const medName = (med.medicineName || med.drugName || '').trim();
      if (!medName) continue;

      const prescribedAmount = Math.max(1, Number(med.quantity) || 1);

      // Search medicine by case-insensitive name or alias
      let medicine = await Medicine.findOne({
        name: { $regex: new RegExp(`^${escapeRegex(medName)}$`, 'i') },
      });

      if (!medicine) {
        // Fallback: match starting words or partial match
        medicine = await Medicine.findOne({
          name: { $regex: new RegExp(escapeRegex(medName), 'i') },
        });
      }

      // If medicine doesn't exist or prescribedAmount > current stockQuantity, return 400
      if (!medicine || prescribedAmount > medicine.stockQuantity) {
        const displayName = medicine ? medicine.name : medName;
        return res.status(400).json({
          message: `Insufficient stock for ${displayName}`,
          requested: prescribedAmount,
          available: medicine ? medicine.stockQuantity : 0,
        });
      }

      deductionPlan.push({
        medicine,
        prescribedAmount,
      });
    }

    // Step 2: Atomic decrement for all medications in the plan
    for (const planItem of deductionPlan) {
      await Medicine.findByIdAndUpdate(planItem.medicine._id, {
        $inc: { stockQuantity: -planItem.prescribedAmount },
      });
    }

    // Step 3: Mark prescription as Dispensed
    prescription.status = 'Dispensed';
    prescription.dispensedBy = req.user._id;
    prescription.dispensedAt = new Date();
    await prescription.save();

    await prescription.populate([
      { path: 'patientId', select: 'firstName lastName contactPhone uhid' },
      { path: 'doctorId', select: 'name email' },
      { path: 'dispensedBy', select: 'name' },
    ]);

    res.status(200).json({
      success: true,
      message: 'Prescription marked as Dispensed and inventory deducted successfully.',
      prescription,
      deductions: deductionPlan.map((d) => ({
        medicine: d.medicine.name,
        deducted: d.prescribedAmount,
        remainingStock: Math.max(0, d.medicine.stockQuantity - d.prescribedAmount),
      })),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
