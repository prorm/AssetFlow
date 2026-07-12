/**
 * seed.js — Run once to create the default admin account.
 * Usage: node seed.js   (or: npm run seed from root)
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

const ADMIN_EMAIL = 'admin@assetflow.com';
const ADMIN_PASSWORD = 'Admin@123';
const ADMIN_NAME = 'System Admin';

async function seed() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/assetflow';
  await mongoose.connect(uri);
  console.log('✅  Connected to MongoDB');

  const existing = await User.findOne({ email: ADMIN_EMAIL });
  if (existing) {
    console.log(`ℹ️  Admin "${ADMIN_EMAIL}" already exists — skipping.`);
  } else {
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
    await User.create({
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      passwordHash,
      role: 'Admin',
      status: 'Active',
    });
    console.log(`🌱  Seeded admin: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  }

  await mongoose.disconnect();
  console.log('👋  Done.');
}

seed().catch((err) => {
  console.error('❌  Seed error:', err);
  process.exit(1);
});
