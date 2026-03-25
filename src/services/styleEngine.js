const { escapeRegExp, normalizeSpacing, splitSentences } = require("../utils/textUtils");

const phraseVariations = [
  ["oleh karena itu", ["maka dari itu", "karena itu", "oleh sebab itu"]],
  ["dengan demikian", ["sehingga", "alhasil", "oleh sebab itu"]],
  ["pada akhirnya", ["pada akhirnya", "pada ujungnya", "akhirnya"]],
  ["di sisi lain", ["sementara itu", "pada sisi yang lain", "sebaliknya"]],
  ["misalnya", ["sebagai contoh", "contohnya", "contoh konkretnya"]],
];

const styleDictionary = {
  formal: [
    ["nggak", "tidak"],
    ["gak", "tidak"],
    ["bikin", "membuat"],
    ["kayak", "seperti"],
    ["biar", "agar"],
    ["udah", "sudah"],
    ["cuma", "hanya"],
    ["user", "pengguna"],
  ],
  santai: [
    ["tidak", "nggak"],
    ["namun", "tapi"],
    ["saya", "aku"],
    ["anda", "kamu"],
    ["membuat", "bikin"],
    ["sehingga", "jadi"],
    ["karena itu", "makanya"],
  ],
  akademik: [
    ["banyak", "sejumlah besar"],
    ["penting", "memiliki signifikansi"],
    ["membantu", "memberikan kontribusi"],
    ["membuat", "menyebabkan"],
    ["karena", "dikarenakan"],
    ["jadi", "oleh sebab itu"],
  ],
};

function replaceMap(text, source, replacements, rng, probability = 0.5) {
  const matcher = new RegExp(`\\b${escapeRegExp(source)}\\b`, "gi");
  let replaced = false;

  const nextText = text.replace(matcher, (match) => {
    if (match.includes("__KW_") || rng() > probability) {
      return match;
    }

    const selected = replacements[Math.floor(rng() * replacements.length)];
    replaced = true;
    return match[0] === match[0].toUpperCase()
      ? selected.charAt(0).toUpperCase() + selected.slice(1)
      : selected;
  });

  return { text: nextText, replaced };
}

function applyPhraseVariations(text, { strength, rng }) {
  let workingText = text;
  let changed = false;

  phraseVariations.forEach(([source, replacements]) => {
    const result = replaceMap(
      workingText,
      source,
      replacements,
      rng,
      Math.min(0.85, 0.2 + strength * 0.13),
    );
    workingText = result.text;
    changed = changed || result.replaced;
  });

  return {
    text: normalizeSpacing(workingText),
    techniquesUsed: changed ? ["phrase_expression_variation"] : [],
  };
}

function applyStyleAdjustment(text, { mode, strength, rng }) {
  const mappings = styleDictionary[mode] || [];
  let workingText = text;
  let changed = false;

  mappings.forEach(([source, target]) => {
    const matcher = new RegExp(`\\b${escapeRegExp(source)}\\b`, "gi");
    workingText = workingText.replace(matcher, (match) => {
      if (match.includes("__KW_") || rng() > Math.min(0.95, 0.4 + strength * 0.1)) {
        return match;
      }

      changed = true;
      return match[0] === match[0].toUpperCase()
        ? target.charAt(0).toUpperCase() + target.slice(1)
        : target;
    });
  });

  const sentencePrefix = {
    formal: ["Selain itu,", "Di samping itu,"],
    santai: ["Selain itu,", "Di sisi lain,"],
    akademik: ["Lebih lanjut,", "Secara konseptual,"],
  }[mode];

  if (strength >= 4 && sentencePrefix?.length) {
    const sentences = splitSentences(workingText);
    if (sentences.length > 1 && rng() > 0.45 && !/^[A-ZÀ-ÿ][^,]+,/.test(sentences[1])) {
      sentences[1] = `${sentencePrefix[Math.floor(rng() * sentencePrefix.length)]} ${sentences[1].charAt(0).toLowerCase()}${sentences[1].slice(1)}`;
      workingText = sentences.join(" ");
      changed = true;
    }
  }

  return {
    text: normalizeSpacing(workingText),
    techniquesUsed: changed ? [`style_adjustment_${mode}`] : [],
  };
}

function humanizeText(text, { strength, mode, rng }) {
  const sentences = splitSentences(text);

  const humanized = sentences.map((sentence, index) => {
    let nextSentence = sentence;

    // Slightly vary sentence openers to reduce repetitive machine patterns.
    if (index > 0 && rng() < Math.min(0.5, strength * 0.08)) {
      nextSentence = nextSentence.replace(
        /^(oleh sebab itu|sehingga|karena itu|maka dari itu)/i,
        mode === "santai" ? "jadi" : "oleh karena itu",
      );
    }

    nextSentence = nextSentence
      .replace(/\b(yang yang)\b/gi, "yang")
      .replace(/\b(dan dan)\b/gi, "dan")
      .replace(/\s+,/g, ",");

    return nextSentence;
  });

  const result = normalizeSpacing(humanized.join(" "));

  return {
    text: result,
    techniquesUsed: result !== text ? ["humanization"] : [],
  };
}

module.exports = {
  applyPhraseVariations,
  applyStyleAdjustment,
  humanizeText,
};
