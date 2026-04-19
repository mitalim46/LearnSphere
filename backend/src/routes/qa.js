const express = require('express');
const router = express.Router();
const Answer = require('../models/Answer');
const VerificationRequest = require('../models/VerificationRequest');
const { processQuestion } = require('../services/decisionEngine');

// POST /api/qa/ask
router.post('/ask', async (req, res) => {
  try {
    const { question, studentEmail, selectedDocument, mode } = req.body;

    if (!question || question.trim() === '') {
      return res.status(400).json({ error: 'Question is required' });
    }

    if (!selectedDocument) {
      return res.status(400).json({ error: 'You must select a document before asking a question' });
    }

    // positional args match decisionEngine.js: (question, selectedDocument, mode)
    const result = await processQuestion(question, selectedDocument, mode || 'default');

    // Check if previously rejected
    const rejected = await VerificationRequest.findOne({
      question: { $regex: new RegExp(question, 'i') },
      status: 'rejected'
    });

    // Save to MongoDB
    await Answer.create({
      question,
      answer: result.answer,
      source: result.tag.toLowerCase(), // "verified" | "resource" | "ai"
      verified: result.tag === 'Verified',
      teacherComment: result.teacherComment || '',
      studentEmail: studentEmail || ''
    });

    res.json({
      answer: result.answer,
      tag: result.tag,
      teacherComment: result.teacherComment || '',
      previouslyRejected: !!rejected,
      rejectionComment: rejected ? rejected.teacherComment : ''
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/qa/all
router.get('/all', async (req, res) => {
  try {
    const answers = await Answer.find().sort({ createdAt: -1 });
    res.json(answers);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/qa/mystats?email=...
router.get('/mystats', async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.json({ total: 0, verified: 0, resource: 0, recent: [] });

    const answers = await Answer.find({ studentEmail: email }).sort({ createdAt: -1 });

    res.json({
      total: answers.length,
      verified: answers.filter(a => a.verified).length,
      resource: answers.filter(a => a.source === 'resource').length,
      recent: answers.slice(0, 5)
    });

  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;