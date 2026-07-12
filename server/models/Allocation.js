const mongoose = require('mongoose');

const allocationSchema = new mongoose.Schema(
  {
    assetId: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset', required: true },
    holderType: {
      type: String,
      enum: ['User', 'Department'],
      required: true,
    },
    holderId: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'holderType' }, // → User or Department
    allocatedAt: { type: Date, default: Date.now },
    expectedReturnDate: { type: Date },
    returnedAt: { type: Date },
    status: {
      type: String,
      enum: ['Active', 'Returned'],
      default: 'Active',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Allocation', allocationSchema);
