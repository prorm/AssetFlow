const express = require('express');
const multer = require('multer');
const path = require('path');
const { Asset, Allocation, MaintenanceRequest } = require('../models');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

const fs = require('fs');

const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// GET /api/assets
router.get('/', auth, async (req, res) => {
  try {
    const { assetTag, serialNumber, categoryId, status, condition, location, overdue } = req.query;
    const filter = {};
    if (assetTag) filter.assetTag = new RegExp(assetTag, 'i');
    if (serialNumber) filter.serialNumber = new RegExp(serialNumber, 'i');
    if (categoryId) filter.categoryId = categoryId;
    if (status) filter.status = status;
    if (condition) filter.condition = condition;
    if (location) filter.location = new RegExp(location, 'i');

    if (overdue === 'true') {
      const overdueAllocations = await Allocation.find({
        status: 'Active',
        expectedReturnDate: { $lt: new Date() }
      }).lean();
      const overdueAssetIds = overdueAllocations.map(a => a.assetId);
      filter._id = { $in: overdueAssetIds };
      filter.status = 'Allocated'; // Overdue items must be allocated
    }

    const assets = await Asset.find(filter)
      .populate('categoryId', 'name')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: assets });
  } catch (error) {
    console.error('Error fetching assets:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/assets/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id)
      .populate('categoryId');
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }
    res.json({ success: true, data: asset });
  } catch (error) {
    console.error('Error fetching asset:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/assets
router.post('/', auth, authorize('AssetManager', 'Admin'), upload.single('photo'), async (req, res) => {
  try {
    const assetData = req.body;
    
    // Parse boolean if sent as string
    if (assetData.isBookable === 'true') assetData.isBookable = true;
    if (assetData.isBookable === 'false') assetData.isBookable = false;

    if (req.file) {
      assetData.photos = ['/uploads/' + req.file.filename];
    }

    const asset = await Asset.create(assetData);
    const populatedAsset = await Asset.findById(asset._id).populate('categoryId');
    
    res.status(201).json({ success: true, data: populatedAsset });
  } catch (error) {
    console.error('Error creating asset:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/assets/:id
router.put('/:id', auth, authorize('AssetManager', 'Admin'), upload.single('photo'), async (req, res) => {
  try {
    const assetData = req.body;
    
    if (assetData.isBookable === 'true') assetData.isBookable = true;
    if (assetData.isBookable === 'false') assetData.isBookable = false;

    if (req.file) {
      assetData.photos = ['/uploads/' + req.file.filename];
    }

    const asset = await Asset.findByIdAndUpdate(req.params.id, assetData, { new: true, runValidators: true })
      .populate('categoryId');

    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    res.json({ success: true, data: asset });
  } catch (error) {
    console.error('Error updating asset:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/assets/:id/history
router.get('/:id/history', auth, authorize('AssetManager', 'Admin'), async (req, res) => {
  try {
    const allocations = await Allocation.find({ assetId: req.params.id })
      .populate('holderId', 'name')
      .lean();
    
    const allocationsFormatted = allocations.map(a => ({
      ...a,
      recordType: 'Allocation',
      createdAt: a.createdAt
    }));

    const maintenance = await MaintenanceRequest.find({ assetId: req.params.id })
      .populate('raisedBy', 'name')
      .lean();

    const maintenanceFormatted = maintenance.map(m => ({
      ...m,
      recordType: 'Maintenance',
      createdAt: m.createdAt
    }));

    const combined = [...allocationsFormatted, ...maintenanceFormatted];
    combined.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ success: true, data: combined });
  } catch (error) {
    console.error('Error fetching asset history:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
