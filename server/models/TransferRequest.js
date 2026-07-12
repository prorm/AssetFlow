const mongoose = require('mongoose');

const transferRequestSchema = new mongoose.Schema(
  {
    assetId: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset', required: true },
    fromHolder: {
      type: { type: String, enum: ['User', 'Department'], required: true },
      id: { type: mongoose.Schema.Types.ObjectId, required: true },
    },
    toHolder: {
      type: { type: String, enum: ['User', 'Department'], required: true },
      id: { type: mongoose.Schema.Types.ObjectId, required: true },
    },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['Requested', 'Approved', 'Rejected'],
      default: 'Requested',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('TransferRequest', transferRequestSchema);
