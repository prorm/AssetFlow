const express = require('express');
const { AssetCategory } = require('../models');
const { auth, authorize } = require('../middleware/auth');
const { createActivityLog } = require('../helpers');

const router = express.Router();

// GET /api/categories
router.get('/', auth, authorize('Admin'), async (req, res) => {
  try {
    const categories = await AssetCategory.find().sort({ name: 1 });
    res.json({ success: true, data: categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/categories
router.post('/', auth, authorize('Admin'), async (req, res) => {
  try {
    const { name, customFields } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const existing = await AssetCategory.findOne({ name });
    if (existing) {
      return res.status(409).json({ error: 'Category name already exists' });
    }

    const category = await AssetCategory.create({
      name,
      customFields: customFields || []
    });
    createActivityLog(req.user._id, 'Created Category', 'AssetCategory', category._id, req.ip);
    res.status(201).json({ success: true, data: category });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/categories/:id
router.put('/:id', auth, authorize('Admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, customFields } = req.body;

    const category = await AssetCategory.findByIdAndUpdate(
      id,
      { name, customFields },
      { new: true, runValidators: true }
    );

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    createActivityLog(req.user._id, 'Updated Category', 'AssetCategory', category._id, req.ip);
    res.json({ success: true, data: category });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
