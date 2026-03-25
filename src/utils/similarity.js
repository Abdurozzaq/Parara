function tokenize(text) {
  return (text.toLowerCase().match(/[a-zA-ZÀ-ÿ0-9_]+/g) || []).filter(Boolean);
}

function toFrequencyMap(text) {
  const frequencies = new Map();

  tokenize(text).forEach((token) => {
    frequencies.set(token, (frequencies.get(token) || 0) + 1);
  });

  return frequencies;
}

function cosineSimilarity(leftText, rightText) {
  const left = toFrequencyMap(leftText);
  const right = toFrequencyMap(rightText);
  const vocabulary = new Set([...left.keys(), ...right.keys()]);

  let dotProduct = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;

  vocabulary.forEach((token) => {
    const leftValue = left.get(token) || 0;
    const rightValue = right.get(token) || 0;

    dotProduct += leftValue * rightValue;
    leftMagnitude += leftValue * leftValue;
    rightMagnitude += rightValue * rightValue;
  });

  if (!leftMagnitude || !rightMagnitude) {
    return 0;
  }

  return dotProduct / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude));
}

function wordOverlap(leftText, rightText) {
  const leftTokens = new Set(tokenize(leftText));
  const rightTokens = new Set(tokenize(rightText));

  if (!leftTokens.size || !rightTokens.size) {
    return 0;
  }

  let intersection = 0;
  leftTokens.forEach((token) => {
    if (rightTokens.has(token)) {
      intersection += 1;
    }
  });

  return intersection / Math.max(leftTokens.size, rightTokens.size);
}

function calculateSimilarity(leftText, rightText) {
  const cosine = cosineSimilarity(leftText, rightText);
  const overlap = wordOverlap(leftText, rightText);

  return Number((((cosine * 0.7) + (overlap * 0.3)) * 100).toFixed(2));
}

module.exports = {
  calculateSimilarity,
};
