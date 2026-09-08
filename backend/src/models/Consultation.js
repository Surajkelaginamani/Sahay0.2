import mongoose from 'mongoose';

// ─── Medication sub-schema (ABDM OPConsultRecord standard) ───────────────────
const medicationSchema = new mongoose.Schema(
  {
    drugName: {
      type: String,
      required: [true, 'Drug name is required'],
      trim: true,
    },
    // Alias / backward compat for medicineName
    medicineName: {
      type: String,
      trim: true,
    },
    dosage: {
      type: String, // e.g. "500mg" or "1 tablet"
      trim: true,
    },
    frequency: {
      type: String, // e.g. "Twice daily after meals", "1-0-1"
      trim: true,
    },
    durationDays: {
      type: Number, // e.g. 5
    },
    instructions: {
      type: String, // e.g. "Take after food, avoid alcohol"
      trim: true,
    },
  },
  { _id: false }
);

// Populate drugName from medicineName if only medicineName was provided
medicationSchema.pre('validate', function () {
  if (!this.drugName && this.medicineName) {
    this.drugName = this.medicineName;
  }
  if (!this.medicineName && this.drugName) {
    this.medicineName = this.drugName;
  }
});

// ─── Investigation Advice sub-schema ──────────────────────────────────────────
const investigationAdviceSchema = new mongoose.Schema(
  {
    testName: {
      type: String,
      required: true,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    routedTo: {
      type: String,
      enum: ['LabHead', 'External', 'Radiology'],
      default: 'LabHead',
    },
    status: {
      type: String,
      enum: ['Ordered', 'In Progress', 'Completed', 'Cancelled'],
      default: 'Ordered',
    },
    orderedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

// ─── Vitals sub-schema (ABDM OPConsultRecord vitals) ──────────────────────────
const vitalsSchema = new mongoose.Schema(
  {
    temp:   { type: String, trim: true }, // e.g. "98.6 °F"
    bp:     { type: String, trim: true }, // e.g. "120/80 mmHg"
    pulse:  { type: String, trim: true }, // e.g. "72 bpm"
    spO2:   { type: String, trim: true }, // e.g. "98 %"
    weight: { type: String, trim: true }, // e.g. "68 kg"
    height: { type: String, trim: true }, // e.g. "172 cm"
  },
  { _id: false }
);

// ─── Consultation Schema ──────────────────────────────────────────────────────
const consultationSchema = new mongoose.Schema(
  {
    // ── Core References (Prompt 5.1) ─────────────────────────────────────────
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
    facilityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hospital',
      required: [true, 'Facility reference is required'],
    },
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      required: [true, 'Appointment reference is required'],
    },

    // Backward-compatible reference aliases
    appointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    hospital: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hospital',
    },

    // ── Clinical Data (OPConsultRecord standards) ───────────────────────────
    vitals: {
      type: vitalsSchema,
      default: () => ({}),
    },

    chiefComplaint: {
      type: String,
      trim: true,
    },

    chiefComplaints: {
      type: mongoose.Schema.Types.Mixed, // allows String or [String]
      default: '',
    },

    medicalHistory: {
      type: mongoose.Schema.Types.Mixed, // allows String or [String]
      default: '',
    },

    clinicalObservations: {
      type: String,
      trim: true,
    },

    diagnosis: {
      type: String,
      trim: true,
    },

    notes: {
      type: String,
      trim: true,
    },

    clinicalNotes: {
      type: String,
      trim: true,
    },

    // ICD-10 structured diagnosis codes (optional)
    icdCodes: [
      {
        code: { type: String, trim: true },
        description: { type: String, trim: true },
      },
    ],

    // Medications list (Prompt 5.1)
    medications: [medicationSchema],

    // Backward-compatible alias for prescription
    prescription: [medicationSchema],

    // Investigation advice (requested lab tests) (Prompt 5.1)
    investigationAdvice: [investigationAdviceSchema],

    // Backward-compatible alias for investigationOrders
    investigationOrders: [investigationAdviceSchema],

    // Referral details (optional)
    referral: {
      isReferred: { type: Boolean, default: false },
      referredTo: { type: String, trim: true },
      referralNote: { type: String, trim: true },
      ashaNotified: { type: Boolean, default: false },
    },

    followUpDate: {
      type: Date,
    },

    // ── Workflow Status ─────────────────────────────────────────────────────
    status: {
      type: String,
      enum: {
        values: ['Open', 'Closed', 'Draft', 'Finalized'],
        message: '{VALUE} is not a valid consultation status',
      },
      default: 'Closed',
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to ensure alias synchronisation
consultationSchema.pre('save', function () {
  if (this.appointmentId && !this.appointment) this.appointment = this.appointmentId;
  if (this.appointment && !this.appointmentId) this.appointmentId = this.appointment;

  if (this.doctorId && !this.doctor) this.doctor = this.doctorId;
  if (this.doctor && !this.doctorId) this.doctorId = this.doctor;

  if (this.facilityId && !this.hospital) this.hospital = this.facilityId;
  if (this.hospital && !this.facilityId) this.facilityId = this.hospital;

  if (this.medications?.length > 0 && (!this.prescription || this.prescription.length === 0)) {
    this.prescription = this.medications;
  } else if (this.prescription?.length > 0 && (!this.medications || this.medications.length === 0)) {
    this.medications = this.prescription;
  }

  if (this.investigationAdvice?.length > 0 && (!this.investigationOrders || this.investigationOrders.length === 0)) {
    this.investigationOrders = this.investigationAdvice;
  } else if (this.investigationOrders?.length > 0 && (!this.investigationAdvice || this.investigationAdvice.length === 0)) {
    this.investigationAdvice = this.investigationOrders;
  }
});

// Indexes for fast querying
consultationSchema.index({ appointmentId: 1, createdAt: -1 });
consultationSchema.index({ patientId: 1, createdAt: -1 });
consultationSchema.index({ doctorId: 1, createdAt: -1 });
consultationSchema.index({ facilityId: 1, createdAt: -1 });

const Consultation = mongoose.model('Consultation', consultationSchema);

export default Consultation;
