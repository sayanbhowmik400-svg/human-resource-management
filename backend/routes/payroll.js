const express = require('express');
const User = require('../models/User');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

function netPay(salary) {
  return salary.basic + salary.hra + salary.allowances - salary.deductions;
}

// GET /api/payroll — HR only: payroll summary for every employee
router.get('/', requireRole('HR'), async (req, res) => {
  const employees = await User.find().select('name empId salary');
  const withNet = employees.map((e) => ({
    id: e._id, name: e.name, empId: e.empId, salary: e.salary, netPay: netPay(e.salary)
  }));
  res.json(withNet);
});

// GET /api/payroll/:userId — self (read-only), or HR viewing anyone
router.get('/:userId', async (req, res) => {
  if (req.user.role !== 'HR' && req.user.id !== req.params.userId) {
    return res.status(403).json({ message: 'You can only view your own payroll.' });
  }
  const employee = await User.findById(req.params.userId).select('name empId salary');
  if (!employee) return res.status(404).json({ message: 'Employee not found.' });
  res.json({ ...employee.toJSON(), netPay: netPay(employee.salary) });
});

// PUT /api/payroll/:userId — HR only: update salary structure
router.put('/:userId', requireRole('HR'), async (req, res) => {
  const { basic, hra, allowances, deductions } = req.body;
  const employee = await User.findById(req.params.userId);
  if (!employee) return res.status(404).json({ message: 'Employee not found.' });

  employee.salary = {
    basic: Number(basic) || 0,
    hra: Number(hra) || 0,
    allowances: Number(allowances) || 0,
    deductions: Number(deductions) || 0
  };
  await employee.save();
  res.json({ ...employee.toJSON(), netPay: netPay(employee.salary) });
});

module.exports = router;