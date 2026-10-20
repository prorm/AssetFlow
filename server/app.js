const path = require('path');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const authRoutes = require('./routes/auth');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'UP',
    db: mongoose.connection.readyState === 1
      ? 'connected'
      : 'disconnected',
  });
});

// Readiness check
app.get('/api/ready', (_req, res) => {
  if (mongoose.connection.readyState === 1) {
    return res.json({ status: 'READY' });
  }

  return res.status(503).json({ status: 'NOT_READY' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/departments', require('./routes/departments'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/users', require('./routes/users'));
app.use('/api/assets', require('./routes/assets'));
app.use('/api/allocations', require('./routes/allocations'));
app.use('/api/transfers', require('./routes/transfers'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/maintenance', require('./routes/maintenance'));
app.use('/api/audits', require('./routes/audits'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/activity-logs', require('./routes/activityLogs'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/ai', require('./routes/ai'));

module.exports = app;