const mongoose = require('mongoose');

const AnswerSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true,
    trim: true
  },
  answer: {
    type: String,
    required: true
  },
  source: {
    type: String,
    enum: ['verified', 'resource', 'ai'],
    default: 'ai'
  },
  verified: {
    type: Boolean,
    default: false
  },
  teacherComment: {
    type: String,
    default: ''
  },
  studentEmail: {           // ← ADD THIS BLOCK
    type: String,
    default: ''
  },
  embedding: {
    type: [Number],  // vector stored as array of floats
    default: []
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});
module.exports = mongoose.model('Answer', AnswerSchema);
