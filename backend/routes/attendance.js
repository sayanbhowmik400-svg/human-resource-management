const express = require('express');
const Attendance = require('../models/Attendance');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

function todayKey() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}
function nowHHMM() {
  const d = new Date();
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

// GET /api/attendance/:userId?month=07&year=2026 — self, or HR viewing anyone
router.get('/:userId', async (req, res) => {
  if (req.user.role !== 'HR' && req.user.id !== req.params.userId) {
    return res.status(403).json({ message: 'You can only view your own attendance.' });
  }
  const { month, year } = req.query;
  const prefix = year && month ? `${year}-${String(month).padStart(2, '0')}` : todayKey().slice(0, 7);
  const records = await Attendance.find({
    user: req.params.userId,
    date: { $regex: `^${prefix}` }
  }).sort({ date: 1 });
  res.json(records);
});

// POST /api/attendance/check-in — self only
router.post('/check-in', async (req, res) => {
  const date = todayKey();
  const existing = await Attendance.findOne({ user: req.user.id, date });
  if (existing && existing.checkIn) {
    return res.status(409).json({ message: 'You have already checked in today.' });
  }
  const record = await Attendance.findOneAndUpdate(
    { user: req.user.id, date },
    { status: 'Present', checkIn: nowHHMM() },
    { upsert: true, new: true }
  );
  res.json(record);
});

// POST /api/attendance/check-out — self only
router.post('/check-out', async (req, res) => {
  const date = todayKey();
  const record = await Attendance.findOne({ user: req.user.id, date });
  if (!record || !record.checkIn) {
    return res.status(400).json({ message: 'Check in before checking out.' });
  }
  record.checkOut = nowHHMM();
  await record.save();
  res.json(record);
});

module.exports = router;