function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeSpacing(text) {
  return text
    .replace(/\s+/g, " ")
    .replace(/\s+([,.!?;:])/g, "$1")
    .replace(/([,.!?;:])(?=[^\s])/g, "$1 ")
    .trim();
}

function normalizePunctuation(text) {
  return text
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/([!?.,]){2,}/g, "$1")
    .replace(/\.{4,}/g, "...");
}

function splitSentences(text) {
  const matches = text.match(/[^.!?]+[.!?]?/g);
  return matches ? matches.map((sentence) => sentence.trim()).filter(Boolean) : [];
}

function capitalizeSentence(text) {
  if (!text) {
    return text;
  }

  return text.charAt(0).toUpperCase() + text.slice(1);
}

function restoreSentenceCase(text) {
  return splitSentences(text)
    .map((sentence) => capitalizeSentence(sentence.toLowerCase()))
    .join(" ")
    .trim();
}

function tokenizeWords(text) {
  return (text.toLowerCase().match(/[a-zA-ZÀ-ÿ0-9_]+/g) || []).filter(Boolean);
}

function preserveKeywords(text, keywords = []) {
  const protectedKeywords = [...new Set(keywords.filter(Boolean))]
    .sort((left, right) => right.length - left.length);

  const replacements = [];
  let workingText = text;

  protectedKeywords.forEach((keyword, index) => {
    const placeholder = `__KW_${index}__`;
    const matcher = new RegExp(`\\b${escapeRegExp(keyword)}\\b`, "gi");

    workingText = workingText.replace(matcher, () => {
      replacements.push({ placeholder, value: keyword });
      return placeholder;
    });
  });

  return {
    text: workingText,
    replacements,
  };
}

function restoreKeywords(text, replacements = []) {
  return replacements.reduce(
    (currentText, item) => currentText.replace(new RegExp(item.placeholder, "g"), item.value),
    text,
  );
}

function chooseByStrength(options, rng, strength) {
  if (!options.length) {
    return null;
  }

  const scaledIndex = Math.floor(rng() * Math.min(options.length, Math.max(1, strength + 1)));
  return options[Math.min(options.length - 1, scaledIndex)];
}

module.exports = {
  escapeRegExp,
  normalizeSpacing,
  normalizePunctuation,
  splitSentences,
  capitalizeSentence,
  restoreSentenceCase,
  tokenizeWords,
  preserveKeywords,
  restoreKeywords,
  chooseByStrength,
};
