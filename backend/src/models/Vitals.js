import mongoose from 'mongoose';

const vitalsSchema = new mongoose.Schema(
  {
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      required: [true, 'Appointment reference is required'],
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: [true, 'Patient reference is required'],
    },
    nurseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Nurse reference is required'],
    },
    facilityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hospital',
      required: [true, 'Facility reference is required'],
    },

    // ── Primary Triage Vitals (Prompt 6.2) ────────────────────────────────────
    bloodPressure: {
      type: String, // e.g. "120/80"
      trim: true,
      required: [true, 'Blood pressure is required'],
    },
    bloodSugar: {
      type: String, // e.g. "110 mg/dL"
      trim: true,
      required: [true, 'Blood sugar is required'],
    },
    height: {
      type: String, // e.g. "172 cm" or "172"
      trim: true,
      required: [true, 'Height is required'],
    },
    weight: {
      type: String, // e.g. "68 kg" or "68"
      trim: true,
      required: [true, 'Weight is required'],
    },

    // ── Secondary / Optional Vitals ───────────────────────────────────────────
    temperature: {
      type: String, // e.g. "98.6 °F"
      trim: true,
    },
    pulse: {
      type: String, // e.g. "72 bpm"
      trim: true,
    },
    spO2: {
      type: String, // e.g. "98 %"
      trim: true,
    },
    bmi: {
      type: String, // e.g. "23.0"
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },

    // ── ABDM Verbal/Digital Proxy Consent Mandate ──────────────────────────────
    consentProvided: {
      type: Boolean,
      required: [true, 'Patient verbal/digital consent is required to record health vitals (ABDM Mandate).'],
      default: true,
    },
    consentTimestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

vitalsSchema.index({ appointmentId: 1, createdAt: -1 });
vitalsSchema.index({ patientId: 1, createdAt: -1 });
vitalsSchema.index({ facilityId: 1, createdAt: -1 });

const Vitals = mongoose.model('Vitals', vitalsSchema);

export default Vitals;
