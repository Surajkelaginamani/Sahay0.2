import mongoose from 'mongoose';

const epidemicAlertSchema = new mongoose.Schema(
  {
    pincode: {
      type: String,
      required: [true, 'Pincode is required'],
      trim: true,
      index: true,
    },
    village: {
      type: String,
      trim: true,
      default: '',
    },
    chiefComplaint: {
      type: String,
      required: [true, 'Chief complaint is required'],
      trim: true,
      index: true,
    },
    caseCount: {
      type: Number,
      required: [true, 'Case count is required'],
      min: 1,
    },
    coordinates: {
      lat: {
        type: Number,
        required: true,
        default: 19.09,
      },
      lng: {
        type: Number,
        required: true,
        default: 74.74,
      },
      latitude: {
        type: Number,
        default: function () {
          return this.lat;
        },
      },
      longitude: {
        type: Number,
        default: function () {
          return this.lng;
        },
      },
    },
    status: {
      type: String,
      enum: ['active', 'investigating', 'resolved'],
      default: 'active',
      index: true,
    },
    severity: {
      type: String,
      enum: ['CRITICAL', 'HIGH', 'MODERATE'],
      default: 'CRITICAL',
    },
    threshold: {
      type: Number,
      default: 10,
    },
    timeWindowHours: {
      type: Number,
      default: 48,
    },
    firstDetectedAt: {
      type: Date,
      default: Date.now,
    },
    lastDetectedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: 'EpidemicAlerts',
  }
);

// Compound index for active alerts query
epidemicAlertSchema.index({ pincode: 1, chiefComplaint: 1, status: 1 });

const EpidemicAlert = mongoose.models.EpidemicAlert || mongoose.model('EpidemicAlert', epidemicAlertSchema);

export default EpidemicAlert;
