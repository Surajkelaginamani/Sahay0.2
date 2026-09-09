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
      sparse: true,
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
      sparse: true,
    },
    patientProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      default: null,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters long'],
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
        return ret;
      },
    },
  }
);

userSchema.index({ phone: 1 }, { sparse: true });
userSchema.index({ patientProfileId: 1 }, { sparse: true });

// Pre-save hook to hash password if modified
userSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Instance method to check password validity
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

export default User;
