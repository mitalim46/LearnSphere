const Groq = require('groq-sdk');

let groqClient = null;

const getGroq = () => {
  if (!groqClient) {
    groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return groqClient;
};

const detectIntent = (question) => {
  const q = question.toLowerCase();
  if (q.includes('in short') || q.includes('brief') || q.includes('summary') || q.includes('summarize')) {
    return 'short';
  }
  if (q.includes('explain') || q.includes('in detail') || q.includes('elaborate') || q.includes('describe')) {
    return 'detailed';
  }
  return 'normal';
};

/**
 * STEP 2 — RAG Processing
 * Merges multiple chunks to handle multi-part questions and uses strict prompting.
 */
/**
 * STEP 2 — RAG Processing
 * Explains retrieved document content simply for student analysis.
 */
const simplifyWithRAG = async (question, chunks, intent) => {
  // Combine top-K chunks into a single string to provide broader context
  const context = chunks.map(c => c.text).join('\n\n');

  // Specific student-centric instructions for the LLM
  const prompt = `You are a helpful teaching assistant.
Your goal is to take the provided CONTEXT and explain it so a student can easily analyze and understand the core concepts.

RULES:
- Use ONLY the provided CONTEXT to answer. 
- If the answer isn't in the context, reply: "INSUFFICIENT_CONTEXT"
- Break down complex terms into simple, student-friendly language.
- Use a "Concept -> Explanation -> Why it matters" structure for clarity.
- Keep the total response under 150 words to avoid information overload.
- DO NOT use phrases like "The document says" or "Based on the text."

CONTEXT:
${context}

QUESTION: ${question}

ANSWER:`;

  const response = await getGroq().chat.completions.create({
    model: 'llama-3.1-8b-instant',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.2, // Low temperature ensures factual grounding
    max_tokens: 400
  });

  const answer = response.choices[0].message.content.trim();
  
  // Logical gate: If the LLM admits it can't find it, trigger the AI fallback in decisionEngine
  if (answer.includes("INSUFFICIENT_CONTEXT") || answer.length < 30) {
    return null;
  }

  return answer;
};
/**
 * STEP 3 — AI Fallback
 */
const generateWithAI = async (question, intent) => {
  const lengthInstruction =
    intent === 'short'    ? 'Give a brief 2-3 sentence answer.' :
    intent === 'detailed' ? 'Give a thorough detailed explanation.' :
                            'Give a clear concise answer.';

  const prompt = `You are a helpful educational assistant.
Format your answer clearly:
- Use numbered steps (Step 1, Step 2...) for processes
- Use bullet points for lists
- Bold key terms with **term**
- ${lengthInstruction}

QUESTION: ${question}

ANSWER:`;

  const response = await getGroq().chat.completions.create({
    model: 'llama-3.1-8b-instant',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: intent === 'short' ? 150 : intent === 'detailed' ? 800 : 400,
    temperature: 0.6
  });

  return response.choices[0].message.content.trim();
};

/**
 * Verified Answer Expansion
 */
const expandVerifiedAnswer = async (question, verifiedAnswer) => {
  const prompt = `Expand the following verified answer to be more detailed for a student.
  
RULES:
- Maintain the original meaning
- Use steps and bold terms
- Format as a helpful lesson

QUESTION: ${question}
VERIFIED ANSWER: ${verifiedAnswer}

EXPANDED ANSWER:`;

  const response = await getGroq().chat.completions.create({
    model: 'llama-3.1-8b-instant',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 800,
    temperature: 0.4
  });

  return response.choices[0].message.content.trim();
};

module.exports = { detectIntent, simplifyWithRAG, generateWithAI, expandVerifiedAnswer };