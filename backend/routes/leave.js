const express = require('express');
const Leave = require('../models/Leave');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// GET /api/leave — HR sees all requests; employees see only their own
router.get('/', async (req, res) => {
  const filter = req.user.role === 'HR' ? {} : { user: req.user.id };
  const requests = await Leave.find(filter).populate('user', 'name email department').sort({ createdAt: -1 });
  res.json(requests);
});

// POST /api/leave — employee applies for leave
router.post('/', async (req, res) => {
  const { type, start, end, remarks } = req.body;
  if (!type || !start || !end) {
    return res.status(400).json({ message: 'Leave type and date range are required.' });
  }
  const request = await Leave.create({
    user: req.user.id, type, start, end, remarks: remarks || 'No remarks provided.'
  });
  res.status(201).json(request);
});

// PUT /api/leave/:id/decision — HR approves or rejects, with an optional comment
router.put('/:id/decision', requireRole('HR'), async (req, res) => {
  const { decision, comment } = req.body;
  if (!['Approved', 'Rejected'].includes(decision)) {
    return res.status(400).json({ message: 'Decision must be Approved or Rejected.' });
  }
  const request = await Leave.findById(req.params.id);
  if (!request) return res.status(404).json({ message: 'Leave request not found.' });

  request.status = decision;
  request.comment = comment || (decision === 'Approved' ? 'Approved by HR.' : 'Not approved at this time.');
  await request.save();
  res.json(request);
});

module.exports = router;