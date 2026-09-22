import mongoose from 'mongoose';

const campSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Camp title is required'],
      trim: true,
    },
    dateTime: {
      type: String,
      required: [true, 'Date and time is required'],
      trim: true,
    },
    date: {
      type: String,
      trim: true,
    },
    pincode: {
      type: String,
      required: [true, 'Target PIN code is required'],
      trim: true,
      index: true,
    },
    registrationUrl: {
      type: String,
      trim: true,
      default: 'https://forms.gle/mocklink123',
    },
    location: {
      type: String,
      trim: true,
    },
    hospitalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hospital',
      default: null,
    },
    hospitalName: {
      type: String,
      trim: true,
      default: 'District Hospital',
    },
    recipients: {
      type: Number,
      default: 142,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

campSchema.pre('save', function (next) {
  if (!this.date && this.dateTime) {
    this.date = this.dateTime;
  }
  if (!this.location) {
    this.location = `District PHC - PIN ${this.pincode}`;
  }
  next();
});

const Camp = mongoose.model('Camp', campSchema);

export default Camp;
