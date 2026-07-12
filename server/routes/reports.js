const express = require('express');
const mongoose = require('mongoose');
const { Asset, Allocation, Booking, MaintenanceRequest, Department } = require('../models');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// GET /api/reports/utilization — asset usage frequency
router.get('/utilization', auth, authorize('DeptHead', 'AssetManager', 'Admin'), async (req, res) => {
  try {
    const allocationCounts = await Allocation.aggregate([
      { $group: { _id: '$assetId', allocationCount: { $sum: 1 } } },
    ]);

    const bookingCounts = await Booking.aggregate([
      { $match: { status: { $ne: 'Cancelled' } } },
      { $group: { _id: '$assetId', bookingCount: { $sum: 1 } } },
    ]);

    // Merge counts
    const usageMap = {};
    for (const a of allocationCounts) {
      usageMap[a._id] = { assetId: a._id, allocationCount: a.allocationCount, bookingCount: 0 };
    }
    for (const b of bookingCounts) {
      if (usageMap[b._id]) {
        usageMap[b._id].bookingCount = b.bookingCount;
      } else {
        usageMap[b._id] = { assetId: b._id, allocationCount: 0, bookingCount: b.bookingCount };
      }
    }

    const usageArray = Object.values(usageMap);
    usageArray.sort((a, b) => (b.allocationCount + b.bookingCount) - (a.allocationCount + a.bookingCount));

    // Populate asset names
    const assetIds = usageArray.map((u) => u.assetId);
    const assets = await Asset.find({ _id: { $in: assetIds } }).select('name assetTag').lean();
    const assetMap = {};
    for (const a of assets) assetMap[a._id.toString()] = a;

    const result = usageArray.map((u) => ({
      ...u,
      asset: assetMap[u.assetId.toString()] || { name: 'Unknown', assetTag: 'N/A' },
      totalUsage: u.allocationCount + u.bookingCount,
    }));

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error generating utilization report:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/reports/maintenance-frequency — by category
router.get('/maintenance-frequency', auth, authorize('DeptHead', 'AssetManager', 'Admin'), async (req, res) => {
  try {
    const result = await MaintenanceRequest.aggregate([
      {
        $lookup: {
          from: 'assets',
          localField: 'assetId',
          foreignField: '_id',
          as: 'asset',
        },
      },
      { $unwind: '$asset' },
      {
        $lookup: {
          from: 'assetcategories',
          localField: 'asset.categoryId',
          foreignField: '_id',
          as: 'category',
        },
      },
      { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$category._id',
          categoryName: { $first: '$category.name' },
          count: { $sum: 1 },
          critical: { $sum: { $cond: [{ $eq: ['$priority', 'Critical'] }, 1, 0] } },
          high: { $sum: { $cond: [{ $eq: ['$priority', 'High'] }, 1, 0] } },
          medium: { $sum: { $cond: [{ $eq: ['$priority', 'Medium'] }, 1, 0] } },
          low: { $sum: { $cond: [{ $eq: ['$priority', 'Low'] }, 1, 0] } },
        },
      },
      { $sort: { count: -1 } },
    ]);

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error generating maintenance frequency report:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/reports/department-summary — department-wise allocation summary
router.get('/department-summary', auth, authorize('DeptHead', 'AssetManager', 'Admin'), async (req, res) => {
  try {
    const result = await Allocation.aggregate([
      { $match: { holderType: 'Department' } },
      {
        $group: {
          _id: '$holderId',
          totalAllocations: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ['$status', 'Active'] }, 1, 0] } },
          returned: { $sum: { $cond: [{ $eq: ['$status', 'Returned'] }, 1, 0] } },
        },
      },
    ]);

    // Also count user allocations grouped by department
    const userAllocations = await Allocation.aggregate([
      { $match: { holderType: 'User' } },
      {
        $lookup: {
          from: 'users',
          localField: 'holderId',
          foreignField: '_id',
          as: 'holder',
        },
      },
      { $unwind: '$holder' },
      {
        $group: {
          _id: '$holder.department',
          userAllocations: { $sum: 1 },
          userActive: { $sum: { $cond: [{ $eq: ['$status', 'Active'] }, 1, 0] } },
        },
      },
    ]);

    // Get department names
    const departments = await Department.find().select('name').lean();
    const deptMap = {};
    for (const d of departments) deptMap[d._id.toString()] = d.name;

    // Merge
    const merged = {};
    for (const r of result) {
      const key = r._id?.toString() || 'unassigned';
      merged[key] = { department: deptMap[key] || 'Direct', ...r };
    }
    for (const u of userAllocations) {
      const key = u._id?.toString() || 'unassigned';
      if (merged[key]) {
        merged[key].userAllocations = u.userAllocations;
        merged[key].userActive = u.userActive;
      } else {
        merged[key] = {
          _id: u._id,
          department: deptMap[key] || 'Unassigned',
          totalAllocations: 0,
          active: 0,
          returned: 0,
          userAllocations: u.userAllocations,
          userActive: u.userActive,
        };
      }
    }

    res.json({ success: true, data: Object.values(merged) });
  } catch (error) {
    console.error('Error generating department summary:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/reports/booking-heatmap — bookings grouped by hour/day
router.get('/booking-heatmap', auth, authorize('DeptHead', 'AssetManager', 'Admin'), async (req, res) => {
  try {
    const result = await Booking.aggregate([
      { $match: { status: { $ne: 'Cancelled' } } },
      {
        $group: {
          _id: {
            dayOfWeek: { $dayOfWeek: '$startTime' },
            hour: { $hour: '$startTime' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.dayOfWeek': 1, '_id.hour': 1 } },
    ]);

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const formatted = result.map((r) => ({
      day: days[r._id.dayOfWeek - 1],
      dayIndex: r._id.dayOfWeek,
      hour: r._id.hour,
      count: r.count,
    }));

    res.json({ success: true, data: formatted });
  } catch (error) {
    console.error('Error generating booking heatmap:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/reports/assets-due — assets that may need maintenance or nearing retirement
router.get('/assets-due', auth, authorize('DeptHead', 'AssetManager', 'Admin'), async (req, res) => {
  try {
    // Assets in poor/damaged condition
    const poorAssets = await Asset.find({
      condition: { $in: ['Poor', 'Damaged'] },
      status: { $nin: ['Retired', 'Disposed', 'Lost'] },
    })
      .populate('categoryId', 'name')
      .select('name assetTag condition status location categoryId')
      .lean();

    // Assets currently under maintenance
    const underMaintenance = await Asset.find({ status: 'UnderMaintenance' })
      .populate('categoryId', 'name')
      .select('name assetTag condition status location categoryId')
      .lean();

    res.json({
      success: true,
      data: {
        poorCondition: poorAssets,
        underMaintenance,
      },
    });
  } catch (error) {
    console.error('Error generating assets due report:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
