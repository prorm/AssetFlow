const express = require('express');
const multer = require('multer');
const path = require('path');
const { Asset, MaintenanceRequest } = require('../models');
const { auth, authorize } = require('../middleware/auth');
const { createNotification, createActivityLog } = require('../helpers');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads')),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// POST /api/maintenance
router.post('/', auth, upload.single('photo'), async (req, res) => {
  try {
    const { assetId, issue, priority } = req.body;
    let photoUrl = null;
    if (req.file) {
      photoUrl = '/uploads/' + req.file.filename;
    }

    const mreq = await MaintenanceRequest.create({
      assetId,
      raisedBy: req.user._id,
      issue,
      priority,
      photo: photoUrl,
      status: 'Pending'
    });

    createActivityLog(req.user._id, 'Created Maintenance Request', 'MaintenanceRequest', mreq._id, req.ip);

    res.status(201).json({ success: true, data: mreq });
  } catch (error) {
    console.error('Error creating maintenance request:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/maintenance
router.get('/', auth, async (req, res) => {
  try {
    const { assetId, status, priority } = req.query;
    const filter = {};
    if (assetId) filter.assetId = assetId;
    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    const mreqs = await MaintenanceRequest.find(filter)
      .populate('assetId', 'name assetTag')
      .populate('raisedBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: mreqs });
  } catch (error) {
    console.error('Error fetching maintenance requests:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/maintenance/:id/approve
router.patch('/:id/approve', auth, authorize('AssetManager', 'Admin'), async (req, res) => {
  try {
    const mreq = await MaintenanceRequest.findById(req.params.id);
    if (!mreq) return res.status(404).json({ error: 'Request not found' });
    if (mreq.status !== 'Pending') return res.status(400).json({ error: 'Can only approve Pending requests' });

    mreq.status = 'Approved';
    await mreq.save();

    const asset = await Asset.findById(mreq.assetId);
    if (asset) {
      asset.status = 'UnderMaintenance';
      await asset.save();
    }

    createNotification(
      mreq.raisedBy, 'maintenance',
      'Your maintenance request has been approved',
      { entityType: 'MaintenanceRequest', entityId: mreq._id }
    );
    createActivityLog(req.user._id, 'Approved Maintenance', 'MaintenanceRequest', mreq._id, req.ip);

    res.json({ success: true, data: mreq });
  } catch (error) {
    console.error('Error approving maintenance:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/maintenance/:id/reject
router.patch('/:id/reject', auth, authorize('AssetManager', 'Admin'), async (req, res) => {
  try {
    const mreq = await MaintenanceRequest.findById(req.params.id);
    if (!mreq) return res.status(404).json({ error: 'Request not found' });
    if (mreq.status !== 'Pending') return res.status(400).json({ error: 'Can only reject Pending requests' });

    mreq.status = 'Rejected';
    await mreq.save();

    createNotification(
      mreq.raisedBy, 'maintenance',
      'Your maintenance request has been rejected',
      { entityType: 'MaintenanceRequest', entityId: mreq._id }
    );
    createActivityLog(req.user._id, 'Rejected Maintenance', 'MaintenanceRequest', mreq._id, req.ip);

    res.json({ success: true, data: mreq });
  } catch (error) {
    console.error('Error rejecting maintenance:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/maintenance/:id/assign-technician
router.patch('/:id/assign-technician', auth, authorize('AssetManager', 'Admin'), async (req, res) => {
  try {
    const { technicianId } = req.body;
    const mreq = await MaintenanceRequest.findById(req.params.id);
    if (!mreq) return res.status(404).json({ error: 'Request not found' });
    if (mreq.status !== 'Approved') return res.status(400).json({ error: 'Can only assign technician to Approved requests' });

    mreq.status = 'TechAssigned';
    await mreq.save();

    createActivityLog(req.user._id, 'Assigned Technician', 'MaintenanceRequest', mreq._id, req.ip);

    res.json({ success: true, data: mreq });
  } catch (error) {
    console.error('Error assigning technician:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/maintenance/:id/start
router.patch('/:id/start', auth, authorize('AssetManager', 'Admin'), async (req, res) => {
  try {
    const mreq = await MaintenanceRequest.findById(req.params.id);
    if (!mreq) return res.status(404).json({ error: 'Request not found' });
    if (mreq.status !== 'TechAssigned') return res.status(400).json({ error: 'Request must be TechAssigned' });

    mreq.status = 'InProgress';
    await mreq.save();

    createActivityLog(req.user._id, 'Started Maintenance', 'MaintenanceRequest', mreq._id, req.ip);

    res.json({ success: true, data: mreq });
  } catch (error) {
    console.error('Error starting maintenance:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/maintenance/:id/resolve
router.patch('/:id/resolve', auth, authorize('AssetManager', 'Admin'), async (req, res) => {
  try {
    const { resolution } = req.body;
    const mreq = await MaintenanceRequest.findById(req.params.id);
    if (!mreq) return res.status(404).json({ error: 'Request not found' });
    if (mreq.status !== 'Approved' && mreq.status !== 'TechAssigned' && mreq.status !== 'InProgress') {
      return res.status(400).json({ error: 'Can only resolve Approved, TechAssigned or InProgress requests' });
    }

    mreq.status = 'Resolved';
    await mreq.save();

    const asset = await Asset.findById(mreq.assetId);
    if (asset) {
      asset.status = 'Available';
      await asset.save();
    }

    createNotification(
      mreq.raisedBy, 'maintenance',
      'Your maintenance request has been resolved',
      { entityType: 'MaintenanceRequest', entityId: mreq._id }
    );
    createActivityLog(req.user._id, 'Resolved Maintenance', 'MaintenanceRequest', mreq._id, req.ip);

    res.json({ success: true, data: mreq });
  } catch (error) {
    console.error('Error resolving maintenance:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
