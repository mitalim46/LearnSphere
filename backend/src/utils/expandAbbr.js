const abbreviations = {
  'aoa': 'analysis of algorithms',
  'daa': 'design and analysis of algorithms',
  'os': 'operating system',
  'cn': 'computer networks',
  'dbms': 'database management system',
  'oop': 'object oriented programming',
  'ds': 'data structures',
  'algo': 'algorithms',
  'tcp': 'transmission control protocol',
  'ip': 'internet protocol',
  'tcp/ip': 'transmission control protocol internet protocol',
  'iot': 'internet of things',
  'ai': 'artificial intelligence',
  'ml': 'machine learning',
  'dl': 'deep learning',
  'api': 'application programming interface',
  'sql': 'structured query language',
  'html': 'hypertext markup language',
  'css': 'cascading style sheets',
  'js': 'javascript',
  'ram': 'random access memory',
  'cpu': 'central processing unit',
  'gpu': 'graphics processing unit',
  'lru': 'least recently used',
  'fifo': 'first in first out',
  'lifo': 'last in first out',
  'bst': 'binary search tree',
  'dfs': 'depth first search',
  'bfs': 'breadth first search',
  'dp': 'dynamic programming',
  'vm': 'virtual machine',
  'http': 'hypertext transfer protocol',
  'https': 'hypertext transfer protocol secure',
  'dns': 'domain name system',
  'lan': 'local area network',
  'wan': 'wide area network',
  'osi': 'open systems interconnection',
};

const expandAbbreviations = (text) => {
  if (!text) return text;
  const words = text.toLowerCase().split(/\s+/);
  const expanded = words.map(word => {
    // Remove punctuation for lookup
    const clean = word.replace(/[^a-z0-9\/]/g, '');
    return abbreviations[clean] || word;
  });
  return expanded.join(' ');
};

module.exports = { expandAbbreviations };