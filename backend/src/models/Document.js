const mongoose = require('mongoose');

const ChunkSchema = new mongoose.Schema({
  text: String,
  index: Number
});

const DocumentSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  contentHash: {        // SHA-256 of file buffer — used for duplicate detection
    type: String,
    default: ''
  },
  studentEmail: {
    type: String,
    default: ''
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  chunks: [ChunkSchema],
  totalChunks: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['processing', 'ready', 'failed'],
    default: 'processing'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Document', DocumentSchema);