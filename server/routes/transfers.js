const express = require('express');
const { TransferRequest, Allocation, User, Department } = require('../models');
const { auth, authorize } = require('../middleware/auth');
const router = express.Router();

// POST /api/transfers (create transfer request)
router.post('/', auth, async (req, res) => {
  try {
    const { assetId, toHolder } = req.body;

    const activeAllocation = await Allocation.findOne({ assetId, status: 'Active' });
    if (!activeAllocation) {
      return res.status(400).json({ error: 'Asset is not currently allocated' });
    }

    const transfer = await TransferRequest.create({
      assetId,
      fromHolder: { type: activeAllocation.holderType, id: activeAllocation.holderId },
      toHolder: { type: toHolder.type, id: toHolder.id },
      requestedBy: req.user._id,
      status: 'Requested'
    });

    res.status(201).json({ success: true, data: transfer });
  } catch (error) {
    console.error('Error creating transfer request:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/transfers (list transfers)
router.get('/', auth, async (req, res) => {
  try {
    const { assetId, status } = req.query;
    const filter = {};
    if (assetId) filter.assetId = assetId;
    if (status) filter.status = status;

    let transfers = await TransferRequest.find(filter)
      .populate('assetId', 'name assetTag')
      .populate('requestedBy', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    transfers = await Promise.all(transfers.map(async (transfer) => {
      // populate fromHolder
      if (transfer.fromHolder.type === 'User') {
        const u = await User.findById(transfer.fromHolder.id).select('name');
        if (u) transfer.fromHolder.name = u.name;
      } else {
        const d = await Department.findById(transfer.fromHolder.id).select('name');
        if (d) transfer.fromHolder.name = d.name;
      }

      // populate toHolder
      if (transfer.toHolder.type === 'User') {
        const u = await User.findById(transfer.toHolder.id).select('name');
        if (u) transfer.toHolder.name = u.name;
      } else {
        const d = await Department.findById(transfer.toHolder.id).select('name');
        if (d) transfer.toHolder.name = d.name;
      }
      return transfer;
    }));

    res.json({ success: true, data: transfers });
  } catch (error) {
    console.error('Error fetching transfers:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/transfers/:id/approve
router.patch('/:id/approve', auth, authorize('AssetManager', 'Admin', 'DeptHead'), async (req, res) => {
  try {
    const transfer = await TransferRequest.findById(req.params.id);
    if (!transfer) return res.status(404).json({ error: 'Transfer request not found' });
    if (transfer.status !== 'Requested') return res.status(400).json({ error: 'Can only approve Requested transfers' });

    // close old allocation
    const oldAllocation = await Allocation.findOne({ assetId: transfer.assetId, status: 'Active' });
    if (oldAllocation) {
      oldAllocation.status = 'Returned';
      oldAllocation.returnedAt = new Date();
      await oldAllocation.save();
    }

    // create new allocation
    await Allocation.create({
      assetId: transfer.assetId,
      holderType: transfer.toHolder.type,
      holderId: transfer.toHolder.id,
      allocatedAt: new Date(),
      status: 'Active'
    });

    transfer.status = 'Approved';
    await transfer.save();

    res.json({ success: true, data: transfer });
  } catch (error) {
    console.error('Error approving transfer:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/transfers/:id/reject
router.patch('/:id/reject', auth, authorize('AssetManager', 'Admin', 'DeptHead'), async (req, res) => {
  try {
    const transfer = await TransferRequest.findById(req.params.id);
    if (!transfer) return res.status(404).json({ error: 'Transfer request not found' });
    if (transfer.status !== 'Requested') return res.status(400).json({ error: 'Can only reject Requested transfers' });

    transfer.status = 'Rejected';
    await transfer.save();

    res.json({ success: true, data: transfer });
  } catch (error) {
    console.error('Error rejecting transfer:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
