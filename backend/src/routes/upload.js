const express = require('express');
const router = express.Router();
const multer = require('multer');
const Document = require('../models/Document');
const { chunkText } = require('../utils/chunker');
const { extractTextFromBuffer } = require('../utils/pdfExtract');
const { addDocumentChunks } = require('../services/faissService');

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// POST /api/upload/pdf
router.post('/pdf', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const studentEmail = req.body.studentEmail || '';
    const originalName = req.file.originalname;

    // --- STEP 1: PREVENT RE-INDEXING FOR THE SAME STUDENT ---
    // Checks if THIS specific student has already uploaded a file with this name
    const existingDoc = await Document.findOne({ originalName, studentEmail });
    
    if (existingDoc) {
      return res.status(200).json({
        alreadyExists: true,
        message: 'Document already exists in your library, proceed to questions',
        documentId: existingDoc._id,
        originalName: existingDoc.originalName,
        totalChunks: existingDoc.totalChunks
      });
    }

    // --- STEP 2: PROCESS NEW FILE ---
    const extractedText = await extractTextFromBuffer(req.file.buffer);

    if (!extractedText || extractedText.trim().length === 0) {
      return res.status(400).json({ error: 'Could not extract text from PDF' });
    }

    const chunks = chunkText(extractedText);

    // Save metadata to MongoDB
    const document = await Document.create({
      filename: originalName,
      originalName,
      studentEmail,
      chunks: chunks.map((text, index) => ({ text, index })),
      totalChunks: chunks.length,
      status: 'ready'
    });

    // --- STEP 3: INDEX IN FAISS ---
    // Passes document chunks and ID to faissService as per your original structure
    await addDocumentChunks(document.chunks, document._id);

    res.status(201).json({
      alreadyExists: false,
      message: 'PDF uploaded and processed successfully',
      documentId: document._id,
      originalName: document.originalName,
      totalChunks: document.totalChunks,
      preview: chunks[0]?.substring(0, 200) + '...'
    });

  } catch (err) {
    console.error("Upload Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/upload/documents
router.get('/documents', async (req, res) => {
  try {
    const { email } = req.query;
    const filter = email ? { studentEmail: email } : {};
    const documents = await Document.find(filter)
      .select('_id originalName totalChunks status createdAt studentEmail')
      .sort({ createdAt: -1 });
    res.json(documents);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;