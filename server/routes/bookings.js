const express = require('express');
const { Asset, Booking } = require('../models');
const { auth, authorize } = require('../middleware/auth');
const router = express.Router();

// POST /api/bookings (create booking)
router.post('/', auth, async (req, res) => {
  try {
    const { assetId, startTime, endTime } = req.body;

    const asset = await Asset.findById(assetId);
    if (!asset) return res.status(404).json({ error: 'Asset not found' });
    if (!asset.isBookable) return res.status(400).json({ error: 'Asset is not bookable' });
    if (asset.status === 'UnderMaintenance') return res.status(400).json({ error: 'Asset is under maintenance' });

    const start = new Date(startTime);
    const end = new Date(endTime);
    if (start >= end) return res.status(400).json({ error: 'Start time must be before end time' });

    const conflict = await Booking.findOne({
      assetId,
      status: { $in: ['Upcoming', 'Ongoing'] },
      startTime: { $lt: end },
      endTime: { $gt: start }
    }).populate('bookedBy', 'name email');

    if (conflict) {
      return res.status(409).json({
        error: "Booking conflicts with existing reservation",
        conflictingSlot: {
          startTime: conflict.startTime,
          endTime: conflict.endTime,
          bookedBy: conflict.bookedBy
        }
      });
    }

    const booking = await Booking.create({
      assetId,
      bookedBy: req.user._id,
      startTime: start,
      endTime: end,
      status: 'Upcoming'
    });

    res.status(201).json({ success: true, data: booking });
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/bookings
router.get('/', auth, async (req, res) => {
  try {
    const { assetId, bookedBy, status } = req.query;
    const filter = {};
    if (assetId) filter.assetId = assetId;
    if (bookedBy) filter.bookedBy = bookedBy;
    // We ignore status from query initially because we derive it, or we could filter post-derivation
    
    let bookings = await Booking.find(filter)
      .populate('assetId', 'name assetTag isBookable')
      .populate('bookedBy', 'name email')
      .sort({ startTime: -1 });

    const now = new Date();
    let processed = bookings.map(b => {
      const booking = b.toObject();
      if (booking.status !== 'Cancelled') {
        const s = new Date(booking.startTime);
        const e = new Date(booking.endTime);
        if (now < s) booking.status = 'Upcoming';
        else if (now >= s && now <= e) booking.status = 'Ongoing';
        else if (now > e) booking.status = 'Completed';
      }
      return booking;
    });

    if (status) {
      processed = processed.filter(b => b.status === status);
    }

    res.json({ success: true, data: processed });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/bookings/:id/cancel
router.patch('/:id/cancel', auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    if (req.user._id.toString() !== booking.bookedBy.toString() && !['AssetManager','Admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    booking.status = 'Cancelled';
    await booking.save();

    res.json({ success: true, data: booking });
  } catch (error) {
    console.error('Error cancelling booking:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/bookings/:id/reschedule
router.patch('/:id/reschedule', auth, async (req, res) => {
  try {
    const { startTime, endTime } = req.body;
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    if (req.user._id.toString() !== booking.bookedBy.toString() && !['AssetManager','Admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);
    if (start >= end) return res.status(400).json({ error: 'Start time must be before end time' });

    const conflict = await Booking.findOne({
      assetId: booking.assetId,
      _id: { $ne: booking._id },
      status: { $in: ['Upcoming', 'Ongoing'] },
      startTime: { $lt: end },
      endTime: { $gt: start }
    }).populate('bookedBy', 'name email');

    if (conflict) {
      return res.status(409).json({
        error: "Booking conflicts with existing reservation",
        conflictingSlot: {
          startTime: conflict.startTime,
          endTime: conflict.endTime,
          bookedBy: conflict.bookedBy
        }
      });
    }

    booking.startTime = start;
    booking.endTime = end;
    booking.status = 'Upcoming';
    await booking.save();

    res.json({ success: true, data: booking });
  } catch (error) {
    console.error('Error rescheduling booking:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
