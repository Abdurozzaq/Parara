const {
  normalizeSpacing,
  preserveKeywords: protectKeywords,
  restoreKeywords,
} = require("../utils/textUtils");
const { createSeededRandom } = require("../utils/random");
const { calculateSimilarity } = require("../utils/similarity");
const { applySynonyms } = require("./synonymEngine");
const { transformStructure } = require("./structureTransformer");
const { preprocessText } = require("./preprocessEngine");
const { formatSentences } = require("./punctuationService");
const {
  applyPhraseVariations,
  applyStyleAdjustment,
  humanizeText,
} = require("./styleEngine");

function createCandidate(text, originalText, techniquesUsed) {
  return {
    text,
    techniquesUsed: [...new Set(techniquesUsed)],
    similarityScore: calculateSimilarity(originalText, text),
  };
}

function rankCandidate(candidate, strength) {
  const targetRanges = {
    1: [78, 96],
    2: [70, 93],
    3: [62, 89],
    4: [54, 84],
    5: [46, 80],
    6: [40, 76],
    7: [34, 72],
    8: [28, 68],
  };

  const [min, max] = targetRanges[strength];
  const midpoint = (min + max) / 2;
  const distance = Math.abs(candidate.similarityScore - midpoint);
  const inRangeBonus =
    candidate.similarityScore >= min && candidate.similarityScore <= max ? 100 : 0;
  const diversityPenalty = candidate.text === "" ? 200 : 0;

  return inRangeBonus - distance - diversityPenalty;
}

function chooseBestCandidate(originalText, candidates, strength) {
  const uniqueCandidates = [];
  const seen = new Set();

  candidates.forEach((candidate) => {
    const normalizedText = normalizeSpacing(candidate.text);
    if (!normalizedText || normalizedText === normalizeSpacing(originalText) || seen.has(normalizedText)) {
      return;
    }

    seen.add(normalizedText);
    uniqueCandidates.push({
      ...candidate,
      text: normalizedText,
    });
  });

  if (!uniqueCandidates.length) {
    return createCandidate(originalText, originalText, ["fallback_original"]);
  }

  return uniqueCandidates
    .map((candidate) => ({
      ...candidate,
      rank: rankCandidate(candidate, strength),
    }))
    .sort((left, right) => right.rank - left.rank)[0];
}

async function paraphrase({ text, mode, strength, preserve_keywords: preserveKeywords = [] }) {
  const seedSource = `${text}::${mode}::${strength}::${preserveKeywords.join("|")}`;
  const rng = createSeededRandom(seedSource);

  // Protect keywords before transformations so required terms survive untouched.
  const { text: safeText, replacements } = protectKeywords(text, preserveKeywords);
  const candidates = [];
  let workingText = safeText;
  let techniques = [];

  // Layer 1: run local preprocessing for normalization, typo, grammar, and punctuation fixes.
  const normalized = preprocessText(workingText, { mode });
  workingText = normalized.text;
  techniques = techniques.concat(normalized.techniquesUsed);
  candidates.push(createCandidate(restoreKeywords(workingText, replacements), text, techniques));

  // Layer 2: replace words/phrases with Indonesian alternatives using a curated dictionary.
  const synonymResult = applySynonyms(workingText, { mode, strength, rng });
  workingText = synonymResult.text;
  techniques = techniques.concat(synonymResult.techniquesUsed);
  candidates.push(createCandidate(restoreKeywords(workingText, replacements), text, techniques));

  // Layer 3: apply sentence-level rewrites such as passive voice or clause reordering.
  const structureResult = transformStructure(workingText, { strength, rng });
  workingText = structureResult.text;
  techniques = techniques.concat(structureResult.techniquesUsed);
  candidates.push(createCandidate(restoreKeywords(workingText, replacements), text, techniques));

  // Layer 4: vary common linking phrases and fixed expressions.
  const phraseResult = applyPhraseVariations(workingText, { strength, rng });
  workingText = phraseResult.text;
  techniques = techniques.concat(phraseResult.techniquesUsed);
  candidates.push(createCandidate(restoreKeywords(workingText, replacements), text, techniques));

  // Layer 5: adapt diction to the requested register: formal, santai, or akademik.
  const styleResult = applyStyleAdjustment(workingText, { mode, strength, rng });
  workingText = styleResult.text;
  techniques = techniques.concat(styleResult.techniquesUsed);
  candidates.push(createCandidate(restoreKeywords(workingText, replacements), text, techniques));

  // Layer 6: smooth repetitive patterns so the output reads more naturally.
  const humanized = humanizeText(workingText, { strength, mode, rng });
  workingText = humanized.text;
  techniques = techniques.concat(humanized.techniquesUsed);
  const finalText = restoreKeywords(
    mode === "santai" ? normalizeSpacing(workingText) : formatSentences(workingText),
    replacements,
  );
  candidates.push(createCandidate(finalText, text, techniques));

  const bestCandidate = chooseBestCandidate(text, candidates, strength);

  return {
    original: text,
    paraphrased: bestCandidate.text,
    techniques_used: bestCandidate.techniquesUsed,
    similarity_score: bestCandidate.similarityScore,
  };
}

module.exports = {
  paraphrase,
};
