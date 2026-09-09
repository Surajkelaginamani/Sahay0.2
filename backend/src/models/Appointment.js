import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema(
  {
    // ── Core References ───────────────────────────────────────────────────────
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: [true, 'Patient reference is required'],
    },
    facilityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hospital',
      required: [true, 'Facility reference is required'],
    },
    receptionistId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // User with role='Receptionist'
      required: [true, 'Receptionist reference is required'],
    },
    assignedDoctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // User with role='Doctor' — optional at booking time
      default: null,
    },

    // ── Scheduling ────────────────────────────────────────────────────────────
    appointmentDate: {
      type: Date,
      required: [true, 'Appointment date is required'],
    },
    timeSlot: {
      type: String, // e.g. "09:00 AM – 09:30 AM"
      trim: true,
    },

    // ── Queue ─────────────────────────────────────────────────────────────────
    queueNumber: {
      type: Number,
      default: null,
    },

    // ── Priority Triage ───────────────────────────────────────────────────────
    priority: {
      type: String,
      enum: {
        values: ['Routine', 'Urgent'],
        message: '{VALUE} is not a valid priority. Use Routine or Urgent.',
      },
      default: 'Routine',
    },

    // ── Workflow Status (Prompt 6.1) ──────────────────────────────────────────
    status: {
      type: String,
      enum: {
        values: [
          'Scheduled',
          'At Triage',
          'Waiting for Doctor',
          'Lab Pending',
          'Reports Ready',
          'Teleconsult Requested',
          'In Teleconsult',
          'Completed',
          // Backward-compatible statuses
          'CheckedIn',
          'Waiting',
          'Cancelled',
        ],
        message: '{VALUE} is not a valid appointment status',
      },
      default: 'Scheduled',
    },

    // ── Teleconsultation Room (Prompt 16.1) ────────────────────────────────────
    teleconsultRoomId: {
      type: String,
      trim: true,
      default: null,
    },

    // ── Lab Coordination & Review Queue (Prompt 8.2) ───────────────────────────
    doctorQueueType: {
      type: String,
      enum: ['Standard', 'Review'],
      default: 'Standard',
    },
    labForwarded: {
      type: Boolean,
      default: false,
    },
    labForwardedAt: {
      type: Date,
    },

    // ── Visit Details ─────────────────────────────────────────────────────────
    visitType: {
      type: String,
      trim: true, // e.g. "General Checkup", "Follow-up", "Emergency"
    },
    chiefComplaint: {
      type: String,
      trim: true,
    },

    // ── Vitals Snapshot (captured at Triage) ──────────────────────────────────
    vitals: {
      bloodPressure: { type: String, trim: true }, // e.g. "120/80"
      bloodSugar:    { type: String, trim: true }, // e.g. "110 mg/dL"
      height:        { type: String, trim: true }, // e.g. "172 cm"
      weight:        { type: String, trim: true }, // e.g. "68 kg"
      temperature:   { type: String, trim: true },
      pulse:         { type: String, trim: true },
      spO2:          { type: String, trim: true },
      bmi:           { type: String, trim: true },
      notes:         { type: String, trim: true },
      recordedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      recordedAt:    { type: Date },
    },

    // ── Staff Notes ───────────────────────────────────────────────────────────
    staffNotes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// ── Compound indexes ──────────────────────────────────────────────────────────
// Fast queue lookup: all appointments at a facility for a given day
appointmentSchema.index({ facilityId: 1, appointmentDate: 1, status: 1 });
// Fast doctor schedule lookup
appointmentSchema.index({ assignedDoctorId: 1, appointmentDate: 1 });
// Fast receptionist audit trail
appointmentSchema.index({ receptionistId: 1, createdAt: -1 });
// Priority triage index: Urgent first, then Routine, within a facility day
appointmentSchema.index({ facilityId: 1, appointmentDate: 1, priority: 1, queueNumber: 1 });

const Appointment = mongoose.model('Appointment', appointmentSchema);

export default Appointment;
