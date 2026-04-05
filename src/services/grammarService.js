const languageAssets = require("./languageAssets");

function preserveTokenCase(source, replacement) {
  if (source === source.toUpperCase()) {
    return replacement.toUpperCase();
  }

  if (source.charAt(0) === source.charAt(0).toUpperCase()) {
    return replacement.charAt(0).toUpperCase() + replacement.slice(1);
  }

  return replacement;
}

function looksLikeVerb(word) {
  return /^(me|mem|men|meng|meny|ber|ter|di|memper|diper)/.test(word);
}

function looksLikeModifier(word) {
  return !languageAssets.functionWords.has(word) && !looksLikeVerb(word);
}

function applyGrammarRules(text) {
  let workingText = text;
  let fixes = 0;

  workingText = workingText.replace(/\b(agar)\s+(supaya)\b/gi, (match, firstWord) => {
    fixes += 1;
    return preserveTokenCase(firstWord, "agar");
  });

  workingText = workingText.replace(/\b(?:adalah|ialah)\s+merupakan\b/gi, () => {
    fixes += 1;
    return "merupakan";
  });

  workingText = workingText.replace(/\bsangat\s+([a-zà-ÿ-]+)\s+sekali\b/gi, (_match, word) => {
    fixes += 1;
    return `sangat ${word}`;
  });

  workingText = workingText.replace(/\btidak\s+([a-zà-ÿ-]+)\s+sekali\b/gi, (match, word) => {
    const token = word.toLowerCase();
    if (!looksLikeModifier(token)) {
      return match;
    }

    fixes += 1;
    return `tidak terlalu ${word}`;
  });

  workingText = workingText.replace(/\bpara\s+hadirin\s+sekalian\b/gi, () => {
    fixes += 1;
    return "hadirin";
  });

  return {
    text: workingText,
    fixes,
    techniquesUsed: fixes > 0 ? ["grammar_fix"] : [],
  };
}

module.exports = {
  applyGrammarRules,
};
