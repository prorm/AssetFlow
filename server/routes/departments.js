const express = require('express');
const { Department } = require('../models');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// GET /api/departments
router.get('/', auth, authorize('Admin'), async (req, res) => {
  try {
    const departments = await Department.find()
      .populate('headUserId', 'name email')
      .populate('parentDepartmentId', 'name')
      .sort({ name: 1 });
    res.json({ success: true, data: departments });
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/departments
router.post('/', auth, authorize('Admin'), async (req, res) => {
  try {
    const { name, headUserId, parentDepartmentId } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const existing = await Department.findOne({ name });
    if (existing) {
      return res.status(409).json({ error: 'Department name already exists' });
    }

    const department = await Department.create({
      name,
      headUserId: headUserId || null,
      parentDepartmentId: parentDepartmentId || null
    });
    res.status(201).json({ success: true, data: department });
  } catch (error) {
    console.error('Error creating department:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/departments/:id
router.put('/:id', auth, authorize('Admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, headUserId, parentDepartmentId, status } = req.body;

    const department = await Department.findByIdAndUpdate(
      id,
      { name, headUserId, parentDepartmentId, status },
      { new: true, runValidators: true }
    );

    if (!department) {
      return res.status(404).json({ error: 'Department not found' });
    }

    res.json({ success: true, data: department });
  } catch (error) {
    console.error('Error updating department:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
