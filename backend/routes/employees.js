const express = require('express');
const User = require('../models/User');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// GET /api/employees — HR only: full employee list
router.get('/', requireRole('HR'), async (req, res) => {
  const employees = await User.find().sort({ name: 1 });
  res.json(employees);
});

// GET /api/employees/:id — self, or HR viewing anyone
router.get('/:id', async (req, res) => {
  if (req.user.role !== 'HR' && req.user.id !== req.params.id) {
    return res.status(403).json({ message: 'You can only view your own profile.' });
  }
  const employee = await User.findById(req.params.id);
  if (!employee) return res.status(404).json({ message: 'Employee not found.' });
  res.json(employee);
});

// PUT /api/employees/:id — self can edit phone/address only; HR can edit any field
router.put('/:id', async (req, res) => {
  const isSelf = req.user.id === req.params.id;
  const isHR = req.user.role === 'HR';
  if (!isSelf && !isHR) {
    return res.status(403).json({ message: 'You do not have permission to edit this profile.' });
  }

  const employee = await User.findById(req.params.id);
  if (!employee) return res.status(404).json({ message: 'Employee not found.' });

  const selfEditableFields = ['phone', 'address'];
  const hrEditableFields = ['name', 'email', 'department', 'designation', 'manager', 'phone', 'address', 'avatarColor'];
  const allowedFields = isHR ? hrEditableFields : selfEditableFields;

  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) employee[field] = req.body[field];
  });

  await employee.save();
  res.json(employee);
});

module.exports = router;