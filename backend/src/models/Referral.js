import mongoose from 'mongoose';

/**
 * Referral
 * Represents an inter-facility referral created by an ASHA/AshaWorker.
 * The lifecycle:
 *   1. ASHA creates referral → status: 'Pending'
 *   2. Patient arrives at destination hospital → Receptionist processes →
 *      status updates to 'Arrived' (simultaneously creates an Appointment)
 *   3. Doctor completes the consultation → status: 'Completed'
 */
const referralSchema = new mongoose.Schema(
  {
    // ── Patient ─────────────────────────────────────────────────────────────
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: [true, 'patientId is required'],
    },

    // ── Who referred ─────────────────────────────────────────────────────────
    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // AshaWorker user
      required: [true, 'referredBy (ASHA user ID) is required'],
    },

    // ── Where referred TO (destination hospital) ──────────────────────────────
    referredToFacility: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hospital',
      required: [true, 'referredToFacility is required'],
    },

    // ── Where referred FROM (optional — PHC/sub-centre the ASHA covers) ───────
    referredFromFacility: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hospital',
      default: null,
    },

    // ── Clinical details ─────────────────────────────────────────────────────
    reasonForReferral: {
      type: String,
      required: [true, 'reasonForReferral is required'],
      trim: true,
    },
    clinicalNotes: {
      type: String,
      trim: true,
      default: '',
    },

    // ── Workflow status ───────────────────────────────────────────────────────
    status: {
      type: String,
      required: true,
      enum: {
        values: ['Pending', 'Arrived', 'Completed'],
        message: '{VALUE} is not a valid referral status',
      },
      default: 'Pending',
    },

    // ── Linked appointment (set when Receptionist processes arrival) ──────────
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      default: null,
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

// Indexes for the two main query patterns
referralSchema.index({ referredBy: 1, status: 1 });           // ASHA: my active referrals
referralSchema.index({ referredToFacility: 1, status: 1 });   // Receptionist: incoming pending referrals
referralSchema.index({ patientId: 1, status: 1 });            // Patient search with referral check

const Referral = mongoose.model('Referral', referralSchema);

export default Referral;
