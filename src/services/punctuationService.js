const {
  capitalizeSentence,
  normalizePunctuation,
  normalizeSpacing,
  splitSentences,
  tokenizeWords,
} = require("../utils/textUtils");
const discourseMarkers = require("../data/discourseMarkers");

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

const CLAUSE_HINTS = new Set([
  "akan",
  "bisa",
  "dapat",
  "harus",
  "perlu",
  "sedang",
  "sudah",
  "telah",
  "masih",
  "sempat",
  "ingin",
  "mau",
]);
const discourseMarkerSet = new Set(discourseMarkers);
const discourseMarkerPrefixes = [...discourseMarkerSet]
  .filter((marker) => marker.includes(" "))
  .sort((left, right) => right.length - left.length);

function normalizeSentenceJoiners(text) {
  const matcher = new RegExp(`\\.\\s+(${SENTENCE_JOINERS.join("|")})\\b`, "gi");
  return text.replace(matcher, (_match, joiner) => `, ${joiner.toLowerCase()}`);
}

function looksLikeVerbToken(token) {
  return /^(me|mem|men|meng|meny|ber|ter|di|memper|diper)/.test(token);
}

function normalizePhrase(text) {
  return tokenizeWords(text).join(" ").trim();
}

function isDiscourseMarkerPhrase(text) {
  const normalizedPhrase = normalizePhrase(text);
  if (!normalizedPhrase) {
    return false;
  }

  if (discourseMarkerSet.has(normalizedPhrase)) {
    return true;
  }

  return discourseMarkerPrefixes.some((marker) => normalizedPhrase.startsWith(`${marker} `));
}

function looksLikeListItem(text) {
  const trimmedText = text.trim();
  const tokens = tokenizeWords(trimmedText);

  if (!tokens.length || tokens.length > 5 || /[.!?;:]/.test(trimmedText) || isDiscourseMarkerPhrase(trimmedText)) {
    return false;
  }

  const clauseHintCount = tokens.filter((token) => CLAUSE_HINTS.has(token) || looksLikeVerbToken(token)).length;
  return clauseHintCount <= 1;
}

function shouldInsertSerialComma(firstItem, secondItem, lastItem) {
  return [firstItem, secondItem, lastItem].every((item) => looksLikeListItem(item));
}

function normalizeSerialComma(text) {
  return text.replace(
    /\b([^,.!?]+),\s+([^,.!?]+)\s+dan\s+([^,.!?]+)\b/gi,
    (match, firstItem, secondItem, lastItem) => {
      if (!shouldInsertSerialComma(firstItem, secondItem, lastItem)) {
        return match;
      }

      return `${firstItem}, ${secondItem}, dan ${lastItem}`;
    },
  );
}

function cleanupNonListCommaBeforeDan(sentence) {
  return sentence.replace(/,\s+dan\s+([^.!?]+)/gi, (match, rightPart, offset, fullSentence) => {
    const leftPart = fullSentence.slice(0, offset);
    const leftChunks = leftPart.split(",").map((chunk) => chunk.trim()).filter(Boolean);
    const lastChunk = leftChunks[leftChunks.length - 1] || "";
    const hasPriorListChunk = leftChunks.length > 1;

    if (hasPriorListChunk && looksLikeListItem(lastChunk) && looksLikeListItem(rightPart.trim())) {
      return match;
    }

    return ` dan ${rightPart.trim()}`;
  });
}

function formatSentences(text) {
  const normalizedText = normalizeSerialComma(
    normalizeSentenceJoiners(
      normalizeSpacing(normalizePunctuation(text)),
    ),
  )
    .replace(/\s+([)\]}])/g, "$1")
    .replace(/([([{])\s+/g, "$1");

  const sentences = splitSentences(normalizedText);
  if (!sentences.length) {
    return normalizedText;
  }

  return sentences
    .map((sentence) => {
      let formatted = cleanupNonListCommaBeforeDan(sentence.trim());
      formatted = capitalizeSentence(formatted);
      if (formatted && !/[.!?]$/.test(formatted)) {
        formatted += ".";
      }

      return formatted;
    })
    .join(" ")
    .trim();
}

function applyPunctuationFixes(text) {
  const formattedText = formatSentences(text);

  return {
    text: formattedText,
    techniquesUsed: formattedText !== text ? ["punctuation_fix"] : [],
  };
}

module.exports = {
  applyPunctuationFixes,
  formatSentences,
};
