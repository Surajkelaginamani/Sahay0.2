import mongoose from 'mongoose';

const medicationItemSchema = new mongoose.Schema(
  {
    medicineName: {
      type: String,
      required: [true, 'Medicine name is required'],
      trim: true,
    },
    // Also support drugName as an alias for interoperability
    drugName: {
      type: String,
      trim: true,
    },
    dosage: {
      type: String, // e.g., "500mg", "1 tablet"
      trim: true,
    },
    frequency: {
      type: String, // e.g., "1-0-1", "Twice daily after food"
      trim: true,
    },
    duration: {
      type: String, // e.g., "5 days", "1 week"
      trim: true,
    },
    instructions: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

medicationItemSchema.pre('validate', function () {
  if (!this.medicineName && this.drugName) {
    this.medicineName = this.drugName;
  }
  if (!this.drugName && this.medicineName) {
    this.drugName = this.medicineName;
  }
});

const prescriptionSchema = new mongoose.Schema(
  {
    consultationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Consultation',
      required: [true, 'Consultation reference is required'],
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: [true, 'Patient reference is required'],
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Doctor reference is required'],
    },
    medications: {
      type: [medicationItemSchema],
      default: [],
    },
    instructions: {
      type: String,
      trim: true,
      default: '',
    },
    facilityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hospital',
      default: null,
    },
    hospital: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hospital',
      default: null,
    },
    status: {
      type: String,
      enum: ['Pending', 'Dispensed'],
      default: 'Pending',
    },
    dispensedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    dispensedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

prescriptionSchema.index({ patientId: 1, createdAt: -1 });
prescriptionSchema.index({ consultationId: 1 });
prescriptionSchema.index({ doctorId: 1, createdAt: -1 });
prescriptionSchema.index({ facilityId: 1, status: 1 });
prescriptionSchema.index({ hospital: 1, status: 1 });

const Prescription = mongoose.model('Prescription', prescriptionSchema);

export default Prescription;
