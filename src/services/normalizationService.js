const languageAssets = require("./languageAssets");
const { escapeRegExp } = require("../utils/textUtils");

const SENTENCE_JOINERS = [
  "dan",
  "tetapi",
  "namun",
  "sehingga",
  "sedangkan",
  "serta",
  "lalu",
  "kemudian",
];

function preserveTokenCase(source, replacement) {
  if (source === source.toUpperCase()) {
    return replacement.toUpperCase();
  }

  if (source.charAt(0) === source.charAt(0).toUpperCase()) {
    return replacement.charAt(0).toUpperCase() + replacement.slice(1);
  }

  return replacement;
}

function replaceUsingMap(text, entries) {
  let workingText = text;
  let replacements = 0;

  Object.entries(entries).forEach(([source, target]) => {
    const matcher = new RegExp(`\\b${escapeRegExp(source)}\\b`, "gi");

    workingText = workingText.replace(matcher, (match) => {
      replacements += 1;
      return preserveTokenCase(match, target);
    });
  });

  return {
    text: workingText,
    replacements,
  };
}

function normalizeSentenceJoiners(text) {
  let replacements = 0;

  const matcher = new RegExp(`\\.\\s+(${SENTENCE_JOINERS.join("|")})\\b`, "gi");
  const normalizedText = text.replace(matcher, (_match, joiner) => {
    replacements += 1;
    return `, ${joiner.toLowerCase()}`;
  });

  return {
    text: normalizedText,
    replacements,
  };
}

function applyNormalization(text, { mode }) {
  let workingText = text;
  let replacements = 0;

  const joinedSentences = normalizeSentenceJoiners(workingText);
  workingText = joinedSentences.text;
  replacements += joinedSentences.replacements;

  const commonNormalized = replaceUsingMap(workingText, languageAssets.commonNormalizationMap);
  workingText = commonNormalized.text;
  replacements += commonNormalized.replacements;

  if (mode !== "santai") {
    const formalNormalized = replaceUsingMap(workingText, languageAssets.formalNormalizationMap);
    workingText = formalNormalized.text;
    replacements += formalNormalized.replacements;
  }

  return {
    text: workingText,
    replacements,
    techniquesUsed: replacements > 0 ? ["text_normalization"] : [],
  };
}

module.exports = {
  applyNormalization,
};
