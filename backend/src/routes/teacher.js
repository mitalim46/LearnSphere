const express = require('express');
const router = express.Router();
const Answer = require('../models/Answer');
const { addVerifiedAnswer } = require('../services/faissService');
const { detectIntent } = require('../services/groqService');

// GET /api/teacher/answers — get all answers for review
router.get('/answers', async (req, res) => {
  try {
    const answers = await Answer.find()
      .sort({ createdAt: -1 });
    res.json(answers);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/teacher/answers/:id — edit answer + add comment
router.put('/answers/:id', async (req, res) => {
  try {
    const { answer, teacherComment } = req.body;

    const updated = await Answer.findByIdAndUpdate(
      req.params.id,
      { answer, teacherComment },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: 'Answer not found' });
    }

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/teacher/answers/:id/verify — mark as verified
router.put('/answers/:id/verify', async (req, res) => {
  try {
    const answer = await Answer.findById(req.params.id);

    if (!answer) {
      return res.status(404).json({ error: 'Answer not found' });
    }

    // Update in MongoDB
    answer.verified = true;
    answer.source = 'verified';
    await answer.save();

    // Add to FAISS verified index
    await addVerifiedAnswer(
      answer._id.toString(),
      answer.question,
      answer.answer,
      answer.teacherComment,
      detectIntent(answer.question)
    );

    res.json({ message: 'Answer verified successfully ✅', answer });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/teacher/answers/:id — delete an answer
router.delete('/answers/:id', async (req, res) => {
  try {
    await Answer.findByIdAndDelete(req.params.id);
    res.json({ message: 'Answer deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;