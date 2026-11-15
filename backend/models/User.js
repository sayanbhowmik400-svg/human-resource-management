const mongoose = require('mongoose');

const salarySchema = new mongoose.Schema({
  basic: { type: Number, default: 0 },
  hra: { type: Number, default: 0 },
  allowances: { type: Number, default: 0 },
  deductions: { type: Number, default: 0 }
}, { _id: false });

const userSchema = new mongoose.Schema({
  empId: { type: String, required: true, unique: true, trim: true },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true }, // bcrypt hash
  role: { type: String, enum: ['Employee', 'HR'], default: 'Employee' },
  department: { type: String, default: 'Unassigned' },
  designation: { type: String, default: '—' },
  manager: { type: String, default: '—' },
  phone: { type: String, default: '' },
  address: { type: String, default: '' },
  joinDate: { type: Date, default: Date.now },
  avatarColor: { type: String, default: '#8E6BAA' },
  salary: { type: salarySchema, default: () => ({}) },
  documents: [{ type: String }],
  isVerified: { type: Boolean, default: false }
}, { timestamps: true });

// Never send the password hash back to the client
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);