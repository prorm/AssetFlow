const express = require('express');
const { ActivityLog } = require('../models');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// GET /api/activity-logs — filterable list
router.get('/', auth, authorize('Admin'), async (req, res) => {
  try {
    const { userId, entityType, startDate, endDate } = req.query;
    const filter = {};
    if (userId) filter.userId = userId;
    if (entityType) filter.entityType = entityType;
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }

    const logs = await ActivityLog.find(filter)
      .populate('userId', 'name email')
      .sort({ timestamp: -1 })
      .limit(500);

    res.json({ success: true, data: logs });
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
