import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      validate: {
        validator: function (v) {
          if (!v) {
            return this.role === 'Patient';
          }
          return /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(v);
        },
        message: 'Please provide a valid email address',
      },
    },
    phone: {
      type: String,
      trim: true,
    },
    patientProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      default: null,
    },
    // ── Static 4-Digit Security PIN (Prompt 7.1) ──────────────────────────────
    pin: {
      type: String,
      trim: true,
    },
    password: {
      type: String,
      required: function () {
        if (this.role === 'Patient' && this.pin) return false;
        return true;
      },
      validate: {
        validator: function (v) {
          if (!v) return this.role === 'Patient' && Boolean(this.pin);
          if (this.role === 'Patient') return v.length >= 4;
          return v.length >= 6;
        },
        message: 'Password must be at least 6 characters long (or 4 digits for Patient PIN)',
      },
    },
    role: {
      type: String,
      required: true,
      enum: {
        values: [
          'Patient',
          'HospitalAdmin',
          'GovtEmployee',
          'ASHA',
          'AshaWorker',
          'Doctor',
          'LabHead',
          'Pharmacist',
          'FacilityAdmin',
          'Receptionist',
          'Nurse',
        ],
        message: '{VALUE} is not a valid user role',
      },
      default: 'Patient',
    },
    hospitalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hospital',
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.password;
        delete ret.pin;
        return ret;
      },
    },
  }
);

userSchema.index(
  { email: 1 },
  { unique: true, partialFilterExpression: { email: { $type: 'string' } } }
);
userSchema.index({ phone: 1 }, { sparse: true });
userSchema.index({ patientProfileId: 1 }, { sparse: true });

// Pre-save hook to hash password and PIN if modified
userSchema.pre('save', async function () {
  if (this.isModified('password') && this.password) {
    if (!this.password.startsWith('$2')) {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    }
  }

  if (this.isModified('pin') && this.pin) {
    if (!this.pin.startsWith('$2')) {
      const salt = await bcrypt.genSalt(10);
      this.pin = await bcrypt.hash(this.pin, salt);
    }
  }
});

// Instance method to check password validity
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Instance method to check 4-digit PIN validity (Prompt 7.1)
userSchema.methods.matchPin = async function (enteredPin) {
  if (!this.pin) return false;
  if (this.pin.startsWith('$2')) {
    return await bcrypt.compare(String(enteredPin), this.pin);
  }
  return this.pin === String(enteredPin);
};

const User = mongoose.model('User', userSchema);

export default User;
