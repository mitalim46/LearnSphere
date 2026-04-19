let pipe = null;

const getEmbedding = async (text) => {
  if (!pipe) {
    console.log('Loading embedding model (first time only)...');
    const { pipeline, env } = await import('@xenova/transformers');
    
    // Cache model locally
    env.cacheDir = './models';
    
    pipe = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    console.log('Embedding model ready ✅');
  }

  const output = await pipe(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
};

module.exports = { getEmbedding };