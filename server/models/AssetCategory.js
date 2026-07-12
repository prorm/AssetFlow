const mongoose = require('mongoose');

const assetCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, trim: true, default: '' },
    status: {
      type: String,
      enum: ['Active', 'Inactive'],
      default: 'Active',
    },
    customFields: [
      {
        key: { type: String, required: true },
        label: { type: String, required: true },
        type: {
          type: String,
          enum: ['Text', 'Number', 'Date', 'Boolean', 'Select'],
          required: true,
        },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('AssetCategory', assetCategorySchema);
