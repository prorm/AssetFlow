const mongoose = require('mongoose');

const maintenanceRequestSchema = new mongoose.Schema(
  {
    assetId: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset', required: true },
    raisedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    issue: { type: String, required: true },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Critical'],
      default: 'Medium',
    },
    photo: { type: String },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected', 'TechAssigned', 'InProgress', 'Resolved'],
      default: 'Pending',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('MaintenanceRequest', maintenanceRequestSchema);
