import mongoose from 'mongoose';

const labOrderSchema = new mongoose.Schema(
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
    testName: {
      type: String,
      required: [true, 'Test name is required'],
      trim: true,
    },
    status: {
      type: String,
      enum: {
        values: ['Requested', 'Sample Collected', 'Completed'],
        message: '{VALUE} is not a valid lab order status',
      },
      default: 'Requested',
    },
    resultURL: {
      type: String,
      trim: true,
      default: '',
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

labOrderSchema.index({ patientId: 1, createdAt: -1 });
labOrderSchema.index({ appointmentId: 1 });
labOrderSchema.index({ facilityId: 1, status: 1 });
labOrderSchema.index({ doctorId: 1, createdAt: -1 });

const LabOrder = mongoose.model('LabOrder', labOrderSchema);

export default LabOrder;
