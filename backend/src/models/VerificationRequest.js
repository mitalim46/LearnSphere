const mongoose = require('mongoose');

const VerificationRequestSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true
  },
  answer: {
    type: String,
    required: true
  },
  source: {
    type: String,
    enum: ['ai', 'resource'],
    required: true
  },
  studentEmail: {
    type: String,
    default: 'anonymous'
  },
  studentComment: {
    type: String,
    default: ''
  },
  assignedTeacher: {     
  type: String,
  default: ''
  },
  status: {
    type: String,
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending'
  },
  teacherComment: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('VerificationRequest', VerificationRequestSchema);