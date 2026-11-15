const mongoose = require('mongoose');

const leaveSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['Paid', 'Sick', 'Unpaid'], required: true },
  start: { type: String, required: true }, // 'YYYY-MM-DD'
  end: { type: String, required: true },
  remarks: { type: String, default: '' },
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
  comment: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Leave', leaveSchema);