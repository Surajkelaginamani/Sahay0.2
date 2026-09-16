import mongoose from 'mongoose';

const medicineSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Medicine name is required'],
      trim: true,
      index: true,
    },
    brandName: {
      type: String,
      trim: true,
      default: '',
    },
    category: {
      type: String,
      trim: true,
      default: 'General',
    },
    dosage: {
      type: String,
      trim: true,
      default: '',
    },
    // Prompt 8.1: stockQuantity (Number, default 0)
    stockQuantity: {
      type: Number,
      default: 0,
      min: [0, 'Stock quantity cannot be negative'],
    },
    // Prompt 8.1: lowStockThreshold (Number, default 50)
    lowStockThreshold: {
      type: Number,
      default: 50,
      min: [0, 'Low stock threshold cannot be negative'],
    },
    unit: {
      type: String,
      trim: true,
      default: 'Tablets',
    },
    price: {
      type: Number,
      default: 0,
    },
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

medicineSchema.index({ name: 1, facilityId: 1 });

const Medicine = mongoose.model('Medicine', medicineSchema);

export default Medicine;
