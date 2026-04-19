const express = require('express');
const router = express.Router();
const VerificationRequest = require('../models/VerificationRequest');
const Answer = require('../models/Answer');
const { addVerifiedAnswer } = require('../services/faissService');
const { detectIntent } = require('../services/groqService');

// POST /api/verify/request — student sends verification request
router.post('/request', async (req, res) => {
  try {
    const { question, answer, source, studentEmail, studentComment, assignedTeacher } = req.body;

    if (!question || !answer || !source) {
      return res.status(400).json({ error: 'Question, answer and source are required' });
    }

const request = await VerificationRequest.create({
  question,
  answer,
  source,
  studentEmail: studentEmail || 'anonymous',
  studentComment: studentComment || '',
  assignedTeacher: assignedTeacher || ''
});

    res.status(201).json({
      message: 'Verification request sent successfully ✅',
      requestId: request._id,
      status: request.status
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/verify/pending — teacher sees all pending requests
router.get('/pending', async (req, res) => {
  try {
    const { teacherEmail } = req.query;
    const filter = { status: 'pending' };
    if (teacherEmail) filter.assignedTeacher = teacherEmail;
    const requests = await VerificationRequest.find(filter)
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/verify/status/:id — student checks request status
router.get('/status/:id', async (req, res) => {
  try {
    const request = await VerificationRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }
    res.json({
      status: request.status,
      teacherComment: request.teacherComment,
      answer: request.answer
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/verify/:id/approve — teacher verifies as-is
router.put('/:id/approve', async (req, res) => {
  try {
    const request = await VerificationRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    // Update status
    request.status = 'verified';
    await request.save();

    // Save to Answer collection
    const answer = await Answer.create({
      question: request.question,
      answer: request.answer,
      source: 'verified',
      verified: true,
      teacherComment: ''
    });

    // Add to FAISS verified index
    await addVerifiedAnswer(
      answer._id.toString(),
      request.question,
      request.answer,
      '',
      detectIntent(request.question)
    );

    res.json({ message: 'Answer verified successfully ✅', request });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/verify/:id/edit-verify — teacher edits then verifies
router.put('/:id/edit-verify', async (req, res) => {
  try {
    const { answer, teacherComment } = req.body;

    const request = await VerificationRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    // Update request
    request.answer = answer || request.answer;
    request.teacherComment = teacherComment || '';
    request.status = 'verified';
    await request.save();

    // Save to Answer collection
    const savedAnswer = await Answer.create({
      question: request.question,
      answer: request.answer,
      source: 'verified',
      verified: true,
      teacherComment: request.teacherComment
    });

    // Add to FAISS verified index
    await addVerifiedAnswer(
      savedAnswer._id.toString(),
      request.question,
      request.answer,
      request.teacherComment,
      detectIntent(request.question)
    );

    res.json({ message: 'Answer edited and verified ✅', request });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/verify/:id/reject — teacher rejects with comment
router.put('/:id/reject', async (req, res) => {
  try {
    const { teacherComment } = req.body;

    const request = await VerificationRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    request.status = 'rejected';
    request.teacherComment = teacherComment || 'This answer needs more research.';
    await request.save();

    res.json({ message: 'Request rejected', request });

  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;