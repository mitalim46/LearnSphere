const path = require('path');
const fs = require('fs');
const { getEmbedding } = require('../utils/embedder');

const FAISS_DIR = path.join(__dirname, '../../faiss');
const VERIFIED_META_PATH = path.join(FAISS_DIR, 'verified_meta.json');
const DOCS_META_PATH = path.join(FAISS_DIR, 'docs_meta.json');

if (!fs.existsSync(FAISS_DIR)) {
  fs.mkdirSync(FAISS_DIR, { recursive: true });
}

// ── HELPERS ──────────────────────────────────────────────────────────────

const cosineSimilarity = (a, b) => {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
};

const loadMeta = (path) => fs.existsSync(path) ? JSON.parse(fs.readFileSync(path, 'utf-8')) : [];
const saveMeta = (path, data) => fs.writeFileSync(path, JSON.stringify(data, null, 2));

// ── VERIFIED ANSWERS (Global) ─────────────────────────────────────────────

const addVerifiedAnswer = async (answerId, question, answer, teacherComment = '', type = 'normal') => {
  const meta = loadMeta(VERIFIED_META_PATH);
  const embedding = await getEmbedding(question);
  meta.push({ answerId, question, answer, teacherComment, type, embedding });
  saveMeta(VERIFIED_META_PATH, meta);
  console.log(`Added verified answer: "${question}"`);
};

const searchVerified = async (question, threshold = 0.70) => {
  const meta = loadMeta(VERIFIED_META_PATH);
  if (meta.length === 0) return null;

  const queryEmbedding = await getEmbedding(question);
  let bestMatch = null;
  let bestScore = -1;

  for (const item of meta) {
    const score = cosineSimilarity(queryEmbedding, item.embedding);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = item;
    }
  }

  return (bestScore >= threshold) ? { ...bestMatch, score: bestScore } : null;
};

// ── DOCUMENT HANDLING (Selected Document Only) ────────────────────────────

const isDocumentIndexed = (documentId, contentHash = null) => {
  const meta = loadMeta(DOCS_META_PATH);
  if (contentHash && meta.some(item => item.contentHash === contentHash)) return true;
  return meta.some(item => item.documentId === documentId.toString());
};

const addDocumentChunks = async (chunks, documentId, contentHash = null) => {
  if (isDocumentIndexed(documentId, contentHash)) {
    return { duplicate: true, message: "Document already exists, proceed to questions" };
  }

  const meta = loadMeta(DOCS_META_PATH);
  for (const chunk of chunks) {
    const embedding = await getEmbedding(chunk.text);
    meta.push({
      text: chunk.text,
      index: chunk.index,
      documentId: documentId.toString(),
      contentHash: contentHash || null,
      embedding
    });
  }
  saveMeta(DOCS_META_PATH, meta);
  return { duplicate: false };
};

const searchDocuments = async (question, documentId, threshold = 0.30, topK = 8) => {
  const meta = loadMeta(DOCS_META_PATH);
  if (meta.length === 0) return [];

  const queryEmbedding = await getEmbedding(question);
  const docChunks = meta.filter(item => item.documentId === documentId.toString());

  if (docChunks.length === 0) return [];

  const scored = docChunks.map(item => ({
    ...item,
    score: cosineSimilarity(queryEmbedding, item.embedding)
  })).filter(c => c.score >= threshold);

  return scored.sort((a, b) => b.score - a.score).slice(0, topK);
};

const getIndexedDocumentIds = () => {
  const meta = loadMeta(DOCS_META_PATH);
  return [...new Set(meta.map(item => item.documentId))];
};

const addDocumentChunksDirect = async (chunks, newDocumentId, sourceDocumentId, contentHash) => {
  const meta = loadMeta(DOCS_META_PATH);
  if (meta.some(item => item.documentId === newDocumentId.toString())) return { duplicate: true };

  const sourceChunks = meta.filter(item => item.documentId === sourceDocumentId.toString());
  
  if (sourceChunks.length > 0) {
    sourceChunks.forEach(sc => {
      meta.push({ ...sc, documentId: newDocumentId.toString(), contentHash: null });
    });
  } else {
    for (const chunk of chunks) {
      const embedding = await getEmbedding(chunk.text);
      meta.push({ text: chunk.text, index: chunk.index, documentId: newDocumentId.toString(), contentHash: null, embedding });
    }
  }
  saveMeta(DOCS_META_PATH, meta);
  return { duplicate: false };
};

module.exports = {
  addVerifiedAnswer,
  searchVerified,
  addDocumentChunks,
  addDocumentChunksDirect,
  searchDocuments,
  isDocumentIndexed,
  getIndexedDocumentIds
};