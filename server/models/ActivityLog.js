const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  action: { type: String, required: true },
  entityType: { type: String, required: true },
  entityId: { type: mongoose.Schema.Types.ObjectId },
  timestamp: { type: Date, default: Date.now },
  ipAddress: { type: String },
});

module.exports = mongoose.model('ActivityLog', activityLogSchema);
