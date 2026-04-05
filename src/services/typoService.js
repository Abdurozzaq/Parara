const languageAssets = require("./languageAssets");

const TOKEN_MATCHER = /__KW_\d+__|[A-Za-zÀ-ÿ]+(?:-[A-Za-zÀ-ÿ]+)*/g;

function preserveTokenCase(source, replacement) {
  if (source === source.toUpperCase()) {
    return replacement.toUpperCase();
  }

  if (source.charAt(0) === source.charAt(0).toUpperCase()) {
    return replacement.charAt(0).toUpperCase() + replacement.slice(1);
  }

  return replacement;
}

function getMaxDistance(word) {
  if (word.length >= 8) {
    return 2;
  }

  return word.length >= 5 ? 1 : 0;
}

function limitedLevenshtein(left, right, maxDistance) {
  if (Math.abs(left.length - right.length) > maxDistance) {
    return maxDistance + 1;
  }

  const previousRow = Array.from({ length: right.length + 1 }, (_, index) => index);

  for (let rowIndex = 1; rowIndex <= left.length; rowIndex += 1) {
    let smallestValue = rowIndex;
    let diagonal = rowIndex - 1;

    previousRow[0] = rowIndex;

    for (let columnIndex = 1; columnIndex <= right.length; columnIndex += 1) {
      const upper = previousRow[columnIndex];
      const substitutionCost = left[rowIndex - 1] === right[columnIndex - 1] ? 0 : 1;
      const currentValue = Math.min(
        previousRow[columnIndex] + 1,
        previousRow[columnIndex - 1] + 1,
        diagonal + substitutionCost,
      );

      diagonal = upper;
      previousRow[columnIndex] = currentValue;
      smallestValue = Math.min(smallestValue, currentValue);
    }

    if (smallestValue > maxDistance) {
      return maxDistance + 1;
    }
  }

  return previousRow[right.length];
}

function findClosestWord(token) {
  const maxDistance = getMaxDistance(token);
  if (maxDistance === 0) {
    return null;
  }

  const candidates = [];
  const firstLetter = token.charAt(0);

  for (let length = token.length - maxDistance; length <= token.length + maxDistance; length += 1) {
    const bucketKey = `${firstLetter}:${length}`;
    const bucketWords = languageAssets.dictionaryBuckets.get(bucketKey) || [];
    candidates.push(...bucketWords);
  }

  let bestCandidate = null;
  let bestDistance = maxDistance + 1;

  candidates.forEach((candidate) => {
    if (candidate === token) {
      bestCandidate = candidate;
      bestDistance = 0;
      return;
    }

    if (candidate.slice(0, 2) !== token.slice(0, 2)) {
      return;
    }

    const distance = limitedLevenshtein(token, candidate, maxDistance);
    if (distance < bestDistance) {
      bestCandidate = candidate;
      bestDistance = distance;
    }
  });

  return bestDistance <= maxDistance ? bestCandidate : null;
}

function applyTypoCorrections(text) {
  let corrections = 0;

  const correctedText = text.replace(TOKEN_MATCHER, (token) => {
    if (token.startsWith("__KW_")) {
      return token;
    }

    const tokenLower = token.toLowerCase();

    if (languageAssets.commonTypoMap[tokenLower]) {
      corrections += 1;
      return preserveTokenCase(token, languageAssets.commonTypoMap[tokenLower]);
    }

    if (
      languageAssets.tokenDictionaryWords.has(tokenLower)
      || tokenLower.length < 5
      || !/^[a-z-]+$/.test(tokenLower)
    ) {
      return token;
    }

    const closestWord = findClosestWord(tokenLower);
    if (!closestWord || closestWord === tokenLower) {
      return token;
    }

    corrections += 1;
    return preserveTokenCase(token, closestWord);
  });

  return {
    text: correctedText,
    corrections,
    techniquesUsed: corrections > 0 ? ["typo_correction"] : [],
  };
}

module.exports = {
  applyTypoCorrections,
};
