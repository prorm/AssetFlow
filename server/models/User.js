const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ['Employee', 'DeptHead', 'AssetManager', 'Admin'],
      default: 'Employee',
    },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    status: {
      type: String,
      enum: ['Active', 'Inactive'],
      default: 'Active',
    },
    otp: { type: String },
    otpExpiresAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
