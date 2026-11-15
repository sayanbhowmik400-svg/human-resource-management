require('dotenv').config();
const bcrypt = require('bcryptjs');
const connectDB = require('./config/db');
const User = require('./models/User');
const Attendance = require('./models/Attendance');
const Leave = require('./models/Leave');

function ymd(d) {
  return d.toISOString().slice(0, 10);
}

async function seed() {
  await connectDB();

  await Promise.all([User.deleteMany({}), Attendance.deleteMany({}), Leave.deleteMany({})]);

  const passwordHash = await bcrypt.hash('pass123', 10);

  const employees = await User.insertMany([
    {
      empId: 'EMP-1001', name: 'Aisha Rahman', email: 'aisha@company.com', password: passwordHash,
      role: 'Employee', department: 'Product Design', designation: 'UX Designer',
      manager: 'Rohit Sen', phone: '+91 98765 43210', address: '12 Lake View Road, Kolkata',
      avatarColor: '#C9932E', isVerified: true,
      salary: { basic: 45000, hra: 18000, allowances: 6000, deductions: 4200 },
      documents: ['Offer Letter.pdf', 'ID Proof.pdf', 'Tax Declaration.pdf']
    },
    {
      empId: 'EMP-1002', name: 'Rohit Sen', email: 'rohit@company.com', password: passwordHash,
      role: 'HR', department: 'Human Resources', designation: 'HR Manager',
      manager: '—', phone: '+91 90000 11122', address: '4 Park Street, Kolkata',
      avatarColor: '#3F7A5A', isVerified: true,
      salary: { basic: 65000, hra: 26000, allowances: 9000, deductions: 5800 },
      documents: ['Offer Letter.pdf', 'ID Proof.pdf']
    },
    {
      empId: 'EMP-1003', name: 'Meera Iyer', email: 'meera@company.com', password: passwordHash,
      role: 'Employee', department: 'Engineering', designation: 'Backend Engineer',
      manager: 'Rohit Sen', phone: '+91 91234 56780', address: '22 MG Road, Bengaluru',
      avatarColor: '#3B5A8A', isVerified: true,
      salary: { basic: 58000, hra: 23000, allowances: 7000, deductions: 5100 },
      documents: ['Offer Letter.pdf', 'ID Proof.pdf', 'Relieving Letter.pdf']
    },
    {
      empId: 'EMP-1004', name: 'Kabir Das', email: 'kabir@company.com', password: passwordHash,
      role: 'Employee', department: 'Sales', designation: 'Account Executive',
      manager: 'Rohit Sen', phone: '+91 99887 66554', address: '9 Salt Lake, Kolkata',
      avatarColor: '#B23A34', isVerified: true,
      salary: { basic: 38000, hra: 15000, allowances: 5000, deductions: 3400 },
      documents: ['Offer Letter.pdf']
    }
  ]);

  // Attendance for the current month up to yesterday
  const now = new Date();
  const attendanceDocs = [];
  employees.forEach((emp) => {
    for (let day = 1; day < now.getDate(); day++) {
      const d = new Date(now.getFullYear(), now.getMonth(), day);
      if (d.getDay() === 0 || d.getDay() === 6) continue; // skip weekends
      const roll = Math.random();
      let status = 'Present', checkIn = '09:0' + Math.floor(Math.random() * 9), checkOut = '18:1' + Math.floor(Math.random() * 9);
      if (roll < 0.08) { status = 'Absent'; checkIn = null; checkOut = null; }
      else if (roll < 0.16) { status = 'Half-day'; checkOut = '13:30'; }
      else if (roll < 0.22) { status = 'Leave'; checkIn = null; checkOut = null; }
      attendanceDocs.push({ user: emp._id, date: ymd(d), status, checkIn, checkOut });
    }
  });
  await Attendance.insertMany(attendanceDocs);

  const [aisha, rohit, meera, kabir] = employees;
  await Leave.insertMany([
    { user: aisha._id, type: 'Sick', start: '2026-06-15', end: '2026-06-16', remarks: 'Fever, resting at home.', status: 'Approved', comment: 'Get well soon.' },
    { user: aisha._id, type: 'Paid', start: '2026-07-10', end: '2026-07-12', remarks: 'Family function out of town.', status: 'Pending', comment: '' },
    { user: meera._id, type: 'Unpaid', start: '2026-06-20', end: '2026-06-20', remarks: 'Personal errand.', status: 'Rejected', comment: 'Critical sprint deadline this week.' },
    { user: kabir._id, type: 'Paid', start: '2026-07-08', end: '2026-07-09', remarks: 'Travelling for a wedding.', status: 'Pending', comment: '' }
  ]);

  console.log('Seed complete. Demo accounts (password: pass123):');
  employees.forEach((e) => console.log(`  ${e.role.padEnd(8)} ${e.email}`));
  process.exit(0);
}

seed().catch((err) => { console.error(err); process.exit(1); });