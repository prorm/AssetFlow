const express = require('express');
const { Asset, Allocation, User, Department } = require('../models');
const { auth, authorize } = require('../middleware/auth');
const router = express.Router();

// POST /api/allocations (create allocation)
router.post('/', auth, authorize('AssetManager', 'Admin'), async (req, res) => {
  try {
    const { assetId, holderType, holderId, expectedReturnDate } = req.body;

    const asset = await Asset.findById(assetId);
    if (!asset) return res.status(404).json({ error: 'Asset not found' });

    if (asset.status !== 'Available') {
      const activeAllocation = await Allocation.findOne({ assetId, status: 'Active' });
      let currentHolder = { name: 'Unknown', id: activeAllocation?.holderId, type: activeAllocation?.holderType };
      
      if (activeAllocation) {
        if (activeAllocation.holderType === 'User') {
          const user = await User.findById(activeAllocation.holderId);
          if (user) currentHolder.name = user.name;
        } else if (activeAllocation.holderType === 'Department') {
          const dept = await Department.findById(activeAllocation.holderId);
          if (dept) currentHolder.name = dept.name;
        }
      }

      return res.status(409).json({
        error: `Currently held by ${currentHolder.name}`,
        currentHolder
      });
    }

    const allocation = await Allocation.create({
      assetId,
      holderType,
      holderId,
      allocatedAt: new Date(),
      expectedReturnDate,
      status: 'Active'
    });

    asset.status = 'Allocated';
    await asset.save();

    res.status(201).json({ success: true, data: allocation });
  } catch (error) {
    console.error('Error creating allocation:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/allocations
router.get('/', auth, async (req, res) => {
  try {
    const { assetId, holderId, status } = req.query;
    const filter = {};
    if (assetId) filter.assetId = assetId;
    if (holderId) filter.holderId = holderId;
    if (status) filter.status = status;

    let allocations = await Allocation.find(filter)
      .populate('assetId', 'name assetTag status')
      .sort({ createdAt: -1 })
      .lean();

    // Populate holder names manually
    const now = new Date();
    allocations = await Promise.all(allocations.map(async (allocation) => {
      if (allocation.holderType === 'User') {
        const user = await User.findById(allocation.holderId).select('name');
        allocation.holderId = user;
      } else if (allocation.holderType === 'Department') {
        const dept = await Department.findById(allocation.holderId).select('name');
        allocation.holderId = dept;
      }

      allocation.isOverdue = allocation.status === 'Active' && 
                             allocation.expectedReturnDate && 
                             new Date(allocation.expectedReturnDate) < now && 
                             !allocation.returnedAt;
      return allocation;
    }));

    res.json({ success: true, data: allocations });
  } catch (error) {
    console.error('Error fetching allocations:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/allocations/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const allocation = await Allocation.findById(req.params.id)
      .populate('assetId', 'name assetTag status')
      .lean();

    if (!allocation) return res.status(404).json({ error: 'Allocation not found' });

    if (allocation.holderType === 'User') {
      allocation.holderId = await User.findById(allocation.holderId).select('name');
    } else if (allocation.holderType === 'Department') {
      allocation.holderId = await Department.findById(allocation.holderId).select('name');
    }

    const now = new Date();
    allocation.isOverdue = allocation.status === 'Active' && 
                           allocation.expectedReturnDate && 
                           new Date(allocation.expectedReturnDate) < now && 
                           !allocation.returnedAt;

    res.json({ success: true, data: allocation });
  } catch (error) {
    console.error('Error fetching allocation:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/allocations/:id/return
router.patch('/:id/return', auth, authorize('AssetManager', 'Admin'), async (req, res) => {
  try {
    const { condition, notes } = req.body;
    const allocation = await Allocation.findById(req.params.id);

    if (!allocation) return res.status(404).json({ error: 'Allocation not found' });
    if (allocation.status === 'Returned') return res.status(400).json({ error: 'Already returned' });

    allocation.returnedAt = new Date();
    allocation.status = 'Returned';
    await allocation.save();

    const asset = await Asset.findById(allocation.assetId);
    if (asset) {
      if (condition) asset.condition = condition;
      asset.status = 'Available';
      await asset.save();
    }

    res.json({ success: true, data: allocation });
  } catch (error) {
    console.error('Error returning allocation:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
