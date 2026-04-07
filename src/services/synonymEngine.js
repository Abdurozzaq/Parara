const synonymEntries = require("../data/synonyms.json");
const { escapeRegExp, chooseByStrength } = require("../utils/textUtils");

function uniqueStrings(values) {
  return [...new Set(values.map((value) => String(value)))];
}

function mergeEntry(map, source, replacements, modes) {
  const key = source.toLowerCase();
  const existing = map.get(key);
  const next = {
    source,
    replacements: uniqueStrings(replacements).filter((item) => item && item.toLowerCase() !== key),
    modes,
  };

  if (!existing) {
    map.set(key, next);
    return;
  }

  map.set(key, {
    source: existing.source,
    replacements: uniqueStrings([...existing.replacements, ...next.replacements]).filter(
      (item) => item && item.toLowerCase() !== key,
    ),
    modes: existing.modes || next.modes,
  });
}

function expandBidirectional(entries) {
  const merged = new Map();

  entries.forEach((entry) => {
    const group = uniqueStrings([entry.source, ...(entry.replacements || [])]).filter(Boolean);
    group.forEach((term) => {
      const others = group.filter((candidate) => candidate.toLowerCase() !== term.toLowerCase());
      mergeEntry(merged, term, others, entry.modes);
    });
  });

  return [...merged.values()];
}

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
  return expandBidirectional(synonymEntries)
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
