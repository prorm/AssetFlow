const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    code: { type: String, required: true, unique: true, trim: true, uppercase: true },
    headUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    parentDepartmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },
    status: {
      type: String,
      enum: ['Active', 'Inactive'],
      default: 'Active',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Department', departmentSchema);
