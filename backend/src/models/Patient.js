import mongoose from 'mongoose';

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
      default: null,
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
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
    },
  }
);

// ── Virtual: full name helper ─────────────────────────────────────────────────
patientSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// ── Index for fast facility-level patient lookup ───────────────────────────────
patientSchema.index({ registeredAtFacility: 1, createdAt: -1 });
patientSchema.index({ contactPhone: 1 });
patientSchema.index({ userId: 1 });
patientSchema.index({ firstName: 1, lastName: 1 });

const Patient = mongoose.model('Patient', patientSchema);

export default Patient;
