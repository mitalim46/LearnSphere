// Splits large text into overlapping chunks for better RAG retrieval
const chunkText = (text, chunkSize = 500, overlap = 50) => {
  // Clean up text
  const cleaned = text
    .replace(/\s+/g, ' ')
    .replace(/\n+/g, ' ')
    .trim();

  const chunks = [];
  let start = 0;

  while (start < cleaned.length) {
    const end = start + chunkSize;
    const chunk = cleaned.slice(start, end).trim();

    if (chunk.length > 50) { // ignore tiny chunks
      chunks.push(chunk);
    }

    start += chunkSize - overlap; // overlap for context continuity
  }

  return chunks;
};

module.exports = { chunkText };