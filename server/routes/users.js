const express = require('express');
const { User } = require('../models');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// GET /api/users
router.get('/', auth, authorize('Admin'), async (req, res) => {
  try {
    const { department, role, status } = req.query;
    const filter = {};
    if (department) filter.department = department;
    if (role) filter.role = role;
    if (status) filter.status = status;

    const users = await User.find(filter)
      .populate('department', 'name')
      .select('-passwordHash')
      .sort({ name: 1 });
      
    res.json({ success: true, data: users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/users/:id/role
router.patch('/:id/role', auth, authorize('Admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (req.user._id.toString() === id) {
      return res.status(403).json({ error: 'Cannot promote yourself' });
    }

    if (!['DeptHead', 'AssetManager'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be DeptHead or AssetManager.' });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { role },
      { new: true, runValidators: true }
    ).select('-passwordHash');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Error promoting user:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
