import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      index: true,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'targetModel',
    },
    targetModel: {
      type: String,
      default: 'Patient',
    },
    uhid: {
      type: String,
      index: true,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Enforce immutability on audit logs
auditLogSchema.pre(['updateOne', 'updateMany', 'findOneAndUpdate', 'findOneAndReplace'], function () {
  throw new Error('Audit logs are immutable and cannot be updated.');
});

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

export default AuditLog;
