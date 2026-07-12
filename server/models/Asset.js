const mongoose = require('mongoose');

const assetSchema = new mongoose.Schema(
  {
    assetTag: { type: String, unique: true },   // auto-generated in pre-save
    name: { type: String, required: true, trim: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'AssetCategory' },
    serialNumber: { type: String, trim: true },
    acquisitionDate: { type: Date },
    acquisitionCost: { type: Number },
    condition: {
      type: String,
      enum: ['New', 'Good', 'Fair', 'Poor', 'Damaged'],
      default: 'New',
    },
    location: { type: String, trim: true },
    photos: [{ type: String }],
    isBookable: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['Available', 'Allocated', 'Reserved', 'UnderMaintenance', 'Lost', 'Retired', 'Disposed'],
      default: 'Available',
    },
  },
  { timestamps: true }
);

// Auto-generate assetTag: AF-0001, AF-0002, …
assetSchema.pre('save', async function (next) {
  if (!this.assetTag) {
    const last = await this.constructor.findOne({}, {}, { sort: { createdAt: -1 } });
    let seq = 1;
    if (last && last.assetTag) {
      const num = parseInt(last.assetTag.split('-')[1], 10);
      if (!isNaN(num)) seq = num + 1;
    }
    this.assetTag = `AF-${String(seq).padStart(4, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Asset', assetSchema);
