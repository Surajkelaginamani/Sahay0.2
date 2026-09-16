import mongoose from 'mongoose';
import crypto from 'crypto';
import bcrypt from 'bcrypt';

const patientSchema = new mongoose.Schema(
  {
    // ── Name ─────────────────────────────────────────────────────────────────
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
    },

    // ── Demographics ──────────────────────────────────────────────────────────
    dob: {
      type: Date,
      required: [true, 'Date of birth is required'],
    },
    gender: {
      type: String,
      enum: {
        values: ['Male', 'Female', 'Other'],
        message: '{VALUE} is not a valid gender',
      },
      required: [true, 'Gender is required'],
    },
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    },

    // ── Contact ───────────────────────────────────────────────────────────────
    contactPhone: {
      type: String,
      trim: true,
    },
    address: {
      village:  { type: String, trim: true },
      district: { type: String, trim: true },
      state:    { type: String, trim: true },
      pincode:  { type: String, trim: true },
    },

    // ── UHID (Unique Health ID — auto-generated on first save) ───────────────
    uhid: {
      type: String,
      unique: true,
      sparse: true, // allows null while enforcing uniqueness when set
      immutable: true,
      trim: true,
    },

    // ── ABHA (Ayushman Bharat Health Account) ─────────────────────────────────
    abhaId: {
      type: String,
      unique: true,
      sparse: true, // allows null/undefined while enforcing uniqueness when set
      trim: true,
      match: [
        /^\d{2}-\d{4}-\d{4}-\d{4}$/,
        'ABHA ID must follow the format XX-XXXX-XXXX-XXXX',
      ],
    },
    abhaVerified: {
      type: Boolean,
      default: false,
    },

    // ── Linked Login Account ──────────────────────────────────────────────────
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    // ── Facility Registration ─────────────────────────────────────────────────
    registeredAtFacility: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hospital',
      default: null,
    },

    // ── Emergency Contact ─────────────────────────────────────────────────────
    emergencyContact: {
      name:     { type: String, trim: true },
      phone:    { type: String, trim: true },
      relation: { type: String, trim: true },
    },

    // ── Clinical Allergies (Prompt 5.1) ───────────────────────────────────────
    allergies: {
      type: [String],
      default: [],
    },

    // ── Static 4-Digit Security PIN (Prompt 7.1) ──────────────────────────────
    pin: {
      type: String,
      trim: true,
    },

    // ── Digital Consent for ABDM Compliance (Prompt 9.1) ───────────────────────
    consentProvided: {
      type: Boolean,
      required: [true, 'Patient consent is legally required to create a health record.'],
    },
    consentTimestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        delete ret.pin;
        return ret;
      },
    },
  }
);

// ── Pre-save hook: auto-generate UHID on first creation & hash PIN ──────────
// NOTE: Mongoose 7+ handles async middleware via Promises — do NOT call next().
patientSchema.pre('save', async function () {
  // Hash PIN with bcrypt if modified and set
  if (this.isModified('pin') && this.pin) {
    if (!this.pin.startsWith('$2')) {
      const salt = await bcrypt.genSalt(10);
      this.pin = await bcrypt.hash(this.pin, salt);
    }
  }

  if (!this.isNew || this.uhid) return; // only on first save, skip if already set

  // Format: SAH-YYYYMM-XXXXX (5 random digits)
  const now    = new Date();
  const year   = now.getFullYear();
  const month  = String(now.getMonth() + 1).padStart(2, '0');
  const suffix = String(Math.floor(10000 + crypto.randomInt(90000))); // 10000–99999
  this.uhid = `SAH-${year}${month}-${suffix}`;

  // Guard against unlikely collision: retry once with a fresh random
  const conflict = await this.constructor.findOne({ uhid: this.uhid }).lean();
  if (conflict) {
    const suffix2 = String(Math.floor(10000 + crypto.randomInt(90000)));
    this.uhid = `SAH-${year}${month}-${suffix2}`;
  }
});

// ── Compare 4-digit PIN ───────────────────────────────────────────────────────
patientSchema.methods.matchPin = async function (enteredPin) {
  if (!this.pin) return false;
  if (this.pin.startsWith('$2')) {
    return await bcrypt.compare(String(enteredPin), this.pin);
  }
  return this.pin === String(enteredPin);
};

// ── Virtual: full name helper ─────────────────────────────────────────────────
patientSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// ── Index for fast facility-level patient lookup ───────────────────────────────
patientSchema.index({ registeredAtFacility: 1, createdAt: -1 });
patientSchema.index({ contactPhone: 1 });
patientSchema.index({ userId: 1 }, { sparse: true });
patientSchema.index({ firstName: 1, lastName: 1 });

const Patient = mongoose.model('Patient', patientSchema);

export default Patient;
