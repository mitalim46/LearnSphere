const extractTextFromBuffer = async (buffer) => {
  try {
    const pdfParse = require('pdf-parse');
    
    // Handle all possible export styles
    const parseFn = typeof pdfParse === 'function' 
      ? pdfParse 
      : pdfParse.default || Object.values(pdfParse)[0];

    const data = await parseFn(buffer);
    return data.text;
  } catch (err) {
    console.error('PDF parse error:', err.message);
    throw err;
  }
};

module.exports = { extractTextFromBuffer };