import mongoose from 'mongoose';
import labCatalog from '../utils/labCatalog.js';

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
      enum: {
        values: labCatalog.map((t) => (typeof t === 'string' ? t : t.name)),
        message: '{VALUE} is not a valid standardized diagnostic test in the catalog',
      },
    },
    status: {
      type: String,
      enum: {
        values: ['Requested', 'Sample Collected', 'Completed'],
        message: '{VALUE} is not a valid lab order status',
      },
      default: 'Requested',
    },
    result: {
      type: String,
      trim: true,
      default: '',
    },
    resultText: {
      type: String,
      trim: true,
      default: '',
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
    // Prompt 6.1: Flag out-of-bounds numeric test results as critical
    isCritical: {
      type: Boolean,
      default: false,
    },
    criticalReason: {
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
