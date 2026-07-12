require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { User } = require('./models');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/assetflow';

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const email = 'admin@assetflow.com';
    const existing = await User.findOne({ email });

    if (existing) {
      console.log('Admin user already exists.');
    } else {
      const passwordHash = await bcrypt.hash('Admin123!', 12);
      await User.create({
        name: 'Admin User',
        email,
        passwordHash,
        role: 'Admin',
        status: 'Active'
      });
      console.log('Admin user created successfully.');
    }
  } catch (error) {
    console.error('Error seeding data:', error);
  } finally {
    mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

seed();
