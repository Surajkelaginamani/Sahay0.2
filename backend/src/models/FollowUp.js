import mongoose from 'mongoose';

const followUpSchema = new mongoose.Schema(
  {
    // ── Patient Reference ───────────────────────────────────────────────────
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: [true, 'Patient reference is required.'],
    },
    patientUhid: {
      type: String,
      trim: true,
      index: true,
    },

    // ── Doctor Reference ────────────────────────────────────────────────────
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Doctor reference is required.'],
    },

    // ── Referring ASHA Worker ───────────────────────────────────────────────
    referringAshaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },

    // ── Clinical Schedule & Instructions ────────────────────────────────────
    followUpDate: {
      type: Date,
      required: [true, 'Follow-up date is required.'],
    },
    instructions: {
      type: String,
      trim: true,
      default: '',
    },

    // ── Status Tracking ─────────────────────────────────────────────────────
    status: {
      type: String,
      enum: {
        values: ['SCHEDULED', 'ASHA_REMINDED', 'COMPLETED', 'MISSED'],
        message: '{VALUE} is not a valid follow-up status.',
      },
      default: 'SCHEDULED',
      index: true,
    },

    // ── Optional Context ────────────────────────────────────────────────────
    facilityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hospital',
      default: null,
    },
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      default: null,
    },
    consultationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Consultation',
      default: null,
    },
    remindedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for fast lookup by ASHA and by Patient
followUpSchema.index({ referringAshaId: 1, status: 1, followUpDate: 1 });
followUpSchema.index({ patientId: 1, status: 1, followUpDate: 1 });

const FollowUp = mongoose.model('FollowUp', followUpSchema);

export default FollowUp;
