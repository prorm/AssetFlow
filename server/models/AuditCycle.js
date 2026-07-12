const mongoose = require('mongoose');

const auditCycleSchema = new mongoose.Schema(
  {
    scope: {
      department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
      location: { type: String },
    },
    dateRange: {
      start: { type: Date, required: true },
      end: { type: Date, required: true },
    },
    auditors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    status: {
      type: String,
      enum: ['Planned', 'InProgress', 'Completed', 'Closed'],
      default: 'Planned',
    },
    items: [
      {
        assetId: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset' },
        result: {
          type: String,
          enum: ['Verified', 'Found', 'Missing', 'Damaged'],
        },
        notes: { type: String, default: '' },
      },
    ],
    discrepancyReport: [
      {
        assetId: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset' },
        result: { type: String },
        notes: { type: String },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('AuditCycle', auditCycleSchema);

