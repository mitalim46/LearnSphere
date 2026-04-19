const { searchVerified, searchDocuments } = require('./faissService');
const { detectIntent, simplifyWithRAG, generateWithAI, expandVerifiedAnswer } = require('./groqService');
const { expandAbbreviations } = require('../utils/expandAbbr');

/**
 * Validates the LLM's response to catch false positives.
 */
const isInvalidResourceResponse = (answer) => {
  const lowerAnswer = answer.toLowerCase();
  const invalidPhrases = [
    "not found", "not mentioned", "not present", "does not contain",
    "no relevant context", "unfortunately", "insufficient information",
    "context provided does not"
  ];

  return invalidPhrases.some(phrase => lowerAnswer.includes(phrase)) || answer.trim().length < 40;
};

/**
 * processQuestion
 */
const processQuestion = async (question, selectedDocument, mode = 'default') => {
  if (!selectedDocument) {
    return { question, answer: 'Please select a document before submitting your question.', tag: 'Error' };
  }

  const intentFromQuestion = detectIntent(question);
  const isDetailMode = mode === 'detail' || intentFromQuestion === 'detailed';
  const expandedQuestion = expandAbbreviations(question.toLowerCase());

  console.log(`\n--- START PROCESSING ---`);
  console.log(`Question: "${question}" | Doc: ${selectedDocument}`);

  // ── STEP 1: VERIFIED DB (GLOBAL) ─────────────────────────────────────────
  console.log('Step 1: Searching verified database...');
  // Threshold lowered to 0.70 for better paraphrase recall
  const verified = 
    await searchVerified(expandedQuestion, 0.70) || 
    await searchVerified(question, 0.70);

  if (verified) {
    console.log(`✅ [DECISION: VERIFIED] Score: ${verified.score.toFixed(4)}`);
    let finalAnswer = verified.answer;
    if (isDetailMode) {
      finalAnswer = await expandVerifiedAnswer(question, verified.answer);
    }
    return { 
      question, 
      answer: `Step 1: Verified match found.\n${finalAnswer}`, 
      tag: 'Verified', 
      source: 'verified', 
      teacherComment: verified.teacherComment || '' 
    };
  }

  // ── STEP 2: RAG (SELECTED DOCUMENT ONLY) ──────────────────────────────────
  console.log(`Step 2: Searching document ${selectedDocument}...`);
  
  // Increased topK to 8 and lowered floor to 0.30 to allow multi-chunk merging
  let chunks = await searchDocuments(expandedQuestion, selectedDocument, 0.30, 8);
  if (!chunks.length) {
    chunks = await searchDocuments(question, selectedDocument, 0.30, 8);
  }

  const bestScore = chunks.length > 0 ? chunks[0].score : 0;
  console.log(`[DEBUG] Chunks: ${chunks.length} | Best Score: ${bestScore.toFixed(4)}`);

  // Only proceed if best chunk is quality (0.35+)
  if (chunks.length > 0 && bestScore >= 0.35) {
    const ragAnswer = await simplifyWithRAG(question, chunks, isDetailMode ? 'detailed' : 'normal');

    if (ragAnswer && !isInvalidResourceResponse(ragAnswer)) {
      console.log('✅ [DECISION: RESOURCE]');
      return { 
        question, 
        answer: `Step 1: No verified match.\nStep 2: Information found in document.\n${ragAnswer}`, 
        tag: 'Resource', 
        source: 'resource' 
      };
    }
    console.log('⚠️ [REJECTED] LLM output invalid or insufficient context.');
  }

  // ── STEP 3: AI FALLBACK ──────────────────────────────────────────────────
  console.log('🤖 [DECISION: AI] Fallback triggered.');
  const aiAnswer = await generateWithAI(question, isDetailMode ? 'detailed' : 'normal');
  
  return { 
    question, 
    answer: `Step 1: No verified match.\nStep 2: Not found in selected document.\nStep 3: AI Generated Answer.\n${aiAnswer}`, 
    tag: 'AI', 
    source: 'ai' 
  };
};

module.exports = { processQuestion };