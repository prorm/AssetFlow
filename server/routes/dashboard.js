const express = require('express');
const { Asset, Allocation, Booking, MaintenanceRequest, TransferRequest } = require('../models');
const { auth } = require('../middleware/auth');

const router = express.Router();

// GET /api/dashboard/stats — KPI aggregate counts
router.get('/stats', auth, async (req, res) => {
  try {
    const [
      availableCount,
      allocatedCount,
      maintenanceTodayCount,
      activeBookingsCount,
      pendingTransfersCount,
      upcomingReturnsCount,
      totalAssets,
    ] = await Promise.all([
      Asset.countDocuments({ status: 'Available' }),
      Asset.countDocuments({ status: 'Allocated' }),
      MaintenanceRequest.countDocuments({
        status: { $in: ['Approved', 'TechAssigned', 'InProgress'] },
      }),
      Booking.countDocuments({ status: { $in: ['Upcoming', 'Ongoing'] } }),
      TransferRequest.countDocuments({ status: 'Requested' }),
      Allocation.countDocuments({
        status: 'Active',
        expectedReturnDate: {
          $gte: new Date(),
          $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      }),
      Asset.countDocuments(),
    ]);

    res.json({
      success: true,
      data: {
        availableCount,
        allocatedCount,
        maintenanceTodayCount,
        activeBookingsCount,
        pendingTransfersCount,
        upcomingReturnsCount,
        totalAssets,
      },
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/dashboard/overdue — overdue allocations and bookings
router.get('/overdue', auth, async (req, res) => {
  try {
    const now = new Date();

    const overdueAllocations = await Allocation.find({
      status: 'Active',
      expectedReturnDate: { $lt: now },
    })
      .populate('assetId', 'name assetTag')
      .sort({ expectedReturnDate: 1 })
      .lean();

    // Populate holder names
    const { User, Department } = require('../models');
    for (const a of overdueAllocations) {
      if (a.holderType === 'User') {
        const u = await User.findById(a.holderId).select('name');
        a.holderName = u?.name || 'Unknown';
      } else {
        const d = await Department.findById(a.holderId).select('name');
        a.holderName = d?.name || 'Unknown';
      }
      a.isOverdue = true;
    }

    res.json({ success: true, data: { overdueAllocations } });
  } catch (error) {
    console.error('Error fetching overdue data:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/dashboard/upcoming — upcoming returns within 7 days
router.get('/upcoming', auth, async (req, res) => {
  try {
    const now = new Date();
    const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const upcomingReturns = await Allocation.find({
      status: 'Active',
      expectedReturnDate: { $gte: now, $lte: weekFromNow },
    })
      .populate('assetId', 'name assetTag')
      .sort({ expectedReturnDate: 1 })
      .lean();

    const { User, Department } = require('../models');
    for (const a of upcomingReturns) {
      if (a.holderType === 'User') {
        const u = await User.findById(a.holderId).select('name');
        a.holderName = u?.name || 'Unknown';
      } else {
        const d = await Department.findById(a.holderId).select('name');
        a.holderName = d?.name || 'Unknown';
      }
    }

    res.json({ success: true, data: { upcomingReturns } });
  } catch (error) {
    console.error('Error fetching upcoming returns:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
