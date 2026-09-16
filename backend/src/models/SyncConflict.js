import mongoose from 'mongoose';

// ─── SyncConflict ─────────────────────────────────────────────────────────────
// Stores incoming ASHA offline sync payloads that are potential duplicates.
// When the ASHA device POSTs to /api/patients/sync and a high-probability match
// is found, we store the raw payload here for admin review instead of creating
// a duplicate Patient record.
// ─────────────────────────────────────────────────────────────────────────────
const syncConflictSchema = new mongoose.Schema(
  {
    // ── Incoming payload from the ASHA device ─────────────────────────────────
    incomingData: {
      type: mongoose.Schema.Types.Mixed, // raw JSON body from the sync request
      required: [true, 'incomingData is required'],
    },

    // ── The existing Patient document that is likely the same person ──────────
    potentialMatchPatientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: [true, 'potentialMatchPatientId is required'],
    },

    // ── Resolution status ─────────────────────────────────────────────────────
    status: {
      type: String,
      enum: ['Pending', 'Merged', 'CreatedNew'],
      default: 'Pending',
    },

    // ── Resolution audit fields ───────────────────────────────────────────────
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    // ID of the new Patient created when action === 'create_new'
    newPatientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      default: null,
    },

    // ── Facility context (which facility's receptionist should resolve this) ──
    facilityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hospital',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Fast lookup of pending conflicts by facility
syncConflictSchema.index({ status: 1, facilityId: 1, createdAt: -1 });

const SyncConflict = mongoose.model('SyncConflict', syncConflictSchema);

export default SyncConflict;
