const synonymEntries = require("../data/synonyms.json");
const { escapeRegExp, chooseByStrength } = require("../utils/textUtils");

function canReplaceInContext(fullText, matchIndex, source) {
  const before = fullText.slice(Math.max(0, matchIndex - 24), matchIndex).toLowerCase();
  const sourceLength = source.length;
  const after = fullText.slice(matchIndex + sourceLength, matchIndex + sourceLength + 24).toLowerCase();

  // Keep placeholders and negations stable to reduce meaning drift.
  if (before.includes("__kw_") || after.includes("__kw_")) {
    return false;
  }

  if (/\b(tidak|bukan|kurang)\s*$/.test(before)) {
    return false;
  }

  return true;
}

function buildEntriesForMode(mode) {
  return [...synonymEntries]
    .filter((entry) => !entry.modes || entry.modes.includes(mode))
    .sort((left, right) => right.source.length - left.source.length);
}

function applySynonyms(text, { mode, strength, rng }) {
  const entries = buildEntriesForMode(mode);
  const probability = Math.min(0.9, 0.15 + strength * 0.16);
  const techniquesUsed = [];
  let workingText = text;
  let replacements = 0;

  entries.forEach((entry) => {
    const matcher = new RegExp(`\\b${escapeRegExp(entry.source)}\\b`, "gi");

    workingText = workingText.replace(matcher, (match, offset) => {
      if (!canReplaceInContext(workingText, offset, match) || rng() > probability) {
        return match;
      }

      const selected = chooseByStrength(entry.replacements, rng, strength);
      if (!selected || selected.toLowerCase() === match.toLowerCase()) {
        return match;
      }

      replacements += 1;
      return match[0] === match[0].toUpperCase()
        ? selected.charAt(0).toUpperCase() + selected.slice(1)
        : selected;
    });
  });

  if (replacements > 0) {
    techniquesUsed.push("synonym_replacement");
  }

  return {
    text: workingText,
    replacements,
    techniquesUsed,
  };
}

module.exports = {
  applySynonyms,
};
