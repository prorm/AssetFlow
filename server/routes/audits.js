const express = require('express');
const { AuditCycle, Asset, User } = require('../models');
const { auth, authorize } = require('../middleware/auth');
const { createNotification, createActivityLog } = require('../helpers');

const router = express.Router();

// POST /api/audits — create audit cycle
router.post('/', auth, authorize('Admin', 'AssetManager'), async (req, res) => {
  try {
    const { scope, dateRange, auditors } = req.body;

    // Build asset filter from scope
    const assetFilter = {};
    if (scope?.department) assetFilter.departmentId = scope.department;
    if (scope?.location) assetFilter.location = new RegExp(scope.location, 'i');

    const assets = await Asset.find(assetFilter).select('_id');
    const items = assets.map((a) => ({ assetId: a._id, result: null, notes: '' }));

    const cycle = await AuditCycle.create({
      scope,
      dateRange,
      auditors,
      status: 'Planned',
      items,
    });

    // Notify auditors
    const auditorUsers = await User.find({ _id: { $in: auditors } }).select('name');
    for (const auditor of auditors) {
      createNotification(
        auditor,
        'audit',
        `You have been assigned to a new audit cycle (${items.length} assets)`,
        { entityType: 'AuditCycle', entityId: cycle._id }
      );
    }

    createActivityLog(req.user._id, 'Created Audit Cycle', 'AuditCycle', cycle._id, req.ip);

    res.status(201).json({ success: true, data: cycle });
  } catch (error) {
    console.error('Error creating audit cycle:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/audits — list all cycles
router.get('/', auth, authorize('Admin', 'AssetManager'), async (req, res) => {
  try {
    const cycles = await AuditCycle.find()
      .populate('scope.department', 'name')
      .populate('auditors', 'name email')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: cycles });
  } catch (error) {
    console.error('Error fetching audit cycles:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/audits/:id — single cycle with populated items
router.get('/:id', auth, authorize('Admin', 'AssetManager'), async (req, res) => {
  try {
    const cycle = await AuditCycle.findById(req.params.id)
      .populate('scope.department', 'name')
      .populate('auditors', 'name email')
      .populate('items.assetId', 'name assetTag location status')
      .populate('discrepancyReport.assetId', 'name assetTag location');

    if (!cycle) return res.status(404).json({ error: 'Audit cycle not found' });
    res.json({ success: true, data: cycle });
  } catch (error) {
    console.error('Error fetching audit cycle:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/audits/:id/items/:assetId — auditor marks result
router.patch('/:id/items/:assetId', auth, async (req, res) => {
  try {
    const { result, notes } = req.body;
    const cycle = await AuditCycle.findById(req.params.id);
    if (!cycle) return res.status(404).json({ error: 'Audit cycle not found' });

    if (cycle.status === 'Closed') {
      return res.status(400).json({ error: 'Cycle is closed' });
    }

    // Only assigned auditors can mark items
    const isAuditor = cycle.auditors.some((a) => a.toString() === req.user._id.toString());
    if (!isAuditor) {
      return res.status(403).json({ error: 'Only assigned auditors can update items' });
    }

    const item = cycle.items.find((i) => i.assetId.toString() === req.params.assetId);
    if (!item) return res.status(404).json({ error: 'Asset not found in this cycle' });

    if (!['Verified', 'Missing', 'Damaged'].includes(result)) {
      return res.status(400).json({ error: 'Result must be Verified, Missing, or Damaged' });
    }

    item.result = result;
    if (notes !== undefined) item.notes = notes;

    // Auto-transition to InProgress on first mark
    if (cycle.status === 'Planned') {
      cycle.status = 'InProgress';
    }

    await cycle.save();

    createActivityLog(req.user._id, `Marked asset ${result}`, 'AuditCycle', cycle._id, req.ip);

    res.json({ success: true, data: cycle });
  } catch (error) {
    console.error('Error updating audit item:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/audits/:id/close — close cycle
router.patch('/:id/close', auth, authorize('Admin', 'AssetManager'), async (req, res) => {
  try {
    const cycle = await AuditCycle.findById(req.params.id);
    if (!cycle) return res.status(404).json({ error: 'Audit cycle not found' });

    if (cycle.status === 'Closed') {
      return res.status(400).json({ error: 'Cycle is already closed' });
    }

    // Build discrepancy report from Missing/Damaged items
    const discrepancies = cycle.items.filter(
      (i) => i.result === 'Missing' || i.result === 'Damaged'
    );
    cycle.discrepancyReport = discrepancies.map((d) => ({
      assetId: d.assetId,
      result: d.result,
      notes: d.notes,
    }));

    // Set confirmed-Missing assets to Lost
    const missingAssetIds = cycle.items
      .filter((i) => i.result === 'Missing')
      .map((i) => i.assetId);

    if (missingAssetIds.length > 0) {
      await Asset.updateMany(
        { _id: { $in: missingAssetIds } },
        { status: 'Lost' }
      );
    }

    // Set confirmed-Damaged assets to Damaged condition
    const damagedAssetIds = cycle.items
      .filter((i) => i.result === 'Damaged')
      .map((i) => i.assetId);

    if (damagedAssetIds.length > 0) {
      await Asset.updateMany(
        { _id: { $in: damagedAssetIds } },
        { condition: 'Damaged' }
      );
    }

    cycle.status = 'Closed';
    await cycle.save();

    // Notify admins/asset managers about discrepancies
    if (discrepancies.length > 0) {
      const managers = await User.find({
        role: { $in: ['Admin', 'AssetManager'] },
      }).select('_id');
      for (const mgr of managers) {
        createNotification(
          mgr._id,
          'audit',
          `Audit cycle closed with ${discrepancies.length} discrepancies (${missingAssetIds.length} missing)`,
          { entityType: 'AuditCycle', entityId: cycle._id }
        );
      }
    }

    createActivityLog(req.user._id, 'Closed Audit Cycle', 'AuditCycle', cycle._id, req.ip);

    // Re-populate for response
    const populated = await AuditCycle.findById(cycle._id)
      .populate('scope.department', 'name')
      .populate('auditors', 'name email')
      .populate('items.assetId', 'name assetTag location status')
      .populate('discrepancyReport.assetId', 'name assetTag location');

    res.json({ success: true, data: populated });
  } catch (error) {
    console.error('Error closing audit cycle:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
