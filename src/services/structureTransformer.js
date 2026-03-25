const { capitalizeSentence, normalizeSpacing, splitSentences } = require("../utils/textUtils");

function activeToPassive(sentence) {
  const matcher = sentence.match(
    /^([A-ZÀ-ÿ][A-Za-zÀ-ÿ0-9\s]{1,30})\s+(me\w+)\s+([A-Za-zÀ-ÿ0-9\s]{2,40})([.!?]?)$/i,
  );

  if (!matcher) {
    return null;
  }

  const [, subject, verb, object, punctuation] = matcher;
  const passiveVerb = verb.replace(/^me/, "di");

  if (passiveVerb === verb) {
    return null;
  }

  return `${capitalizeSentence(object.trim())} ${passiveVerb.trim()} oleh ${subject.trim()}${punctuation || "."}`;
}

function transformMelakukan(sentence) {
  const matcher = sentence.match(
    /^([A-ZÀ-ÿ][A-Za-zÀ-ÿ0-9\s]{1,30})\s+melakukan\s+([A-Za-zÀ-ÿ0-9\s]{2,40})([.!?]?)$/i,
  );

  if (!matcher) {
    return null;
  }

  const [, subject, action, punctuation] = matcher;
  return `${capitalizeSentence(action.trim())} dilakukan oleh ${subject.trim()}${punctuation || "."}`;
}

function reorderClause(sentence) {
  const matcher = sentence.match(
    /^(karena|ketika|meskipun)\s+(.+?),\s*(.+?)([.!?]?)$/i,
  );

  if (!matcher) {
    return null;
  }

  const [, connector, clauseA, clauseB, punctuation] = matcher;
  const normalizedConnector = connector.toLowerCase();
  const ending = punctuation || ".";

  if (normalizedConnector === "karena") {
    return `${capitalizeSentence(clauseB.trim())} karena ${clauseA.trim()}${ending}`;
  }

  return `${capitalizeSentence(clauseB.trim())}, ${normalizedConnector} ${clauseA.trim()}${ending}`;
}

function splitLongSentence(sentence) {
  if (sentence.length < 110) {
    return null;
  }

  const parts = sentence.split(/\s+(dan|tetapi|namun|sehingga)\s+/i);
  if (parts.length < 3) {
    return null;
  }

  const [first, connector, second] = parts;
  return `${capitalizeSentence(first.trim())}. ${capitalizeSentence(connector.toLowerCase())} ${second.trim()}`;
}

function mergeShortSentences(sentences) {
  const merged = [];

  for (let index = 0; index < sentences.length; index += 1) {
    const current = sentences[index];
    const next = sentences[index + 1];

    if (
      next &&
      current.length < 45 &&
      next.length < 45 &&
      !/[,:;]$/.test(current)
    ) {
      merged.push(
        `${current.replace(/[.!?]$/, "")}, sehingga ${next.charAt(0).toLowerCase()}${next.slice(1)}`,
      );
      index += 1;
      continue;
    }

    merged.push(current);
  }

  return merged;
}

function transformSentence(sentence, strength, rng) {
  const transformers = [
    activeToPassive,
    transformMelakukan,
    reorderClause,
    splitLongSentence,
  ];

  if (strength < 2) {
    return sentence;
  }

  const shuffled = [...transformers].sort(() => rng() - 0.5);
  for (const transform of shuffled) {
    if (rng() > Math.min(0.85, 0.2 + strength * 0.15)) {
      continue;
    }

    const candidate = transform(sentence);
    if (candidate && candidate !== sentence) {
      return normalizeSpacing(candidate);
    }
  }

  return sentence;
}

function transformStructure(text, { strength, rng }) {
  const sentences = splitSentences(text);
  const transformed = sentences.map((sentence) => transformSentence(sentence, strength, rng));
  const finalSentences = strength >= 4 ? mergeShortSentences(transformed) : transformed;

  const changed = finalSentences.join(" ") !== text;

  return {
    text: normalizeSpacing(finalSentences.join(" ")),
    techniquesUsed: changed ? ["sentence_structure_transformation"] : [],
  };
}

module.exports = {
  transformStructure,
};
