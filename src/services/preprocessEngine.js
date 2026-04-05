const { applyNormalization } = require("./normalizationService");
const { applyTypoCorrections } = require("./typoService");
const { applyGrammarRules } = require("./grammarService");
const { applyPunctuationFixes } = require("./punctuationService");

function preprocessText(text, { mode }) {
  const stages = [
    () => applyNormalization(text, { mode }),
    (currentText) => applyTypoCorrections(currentText, { mode }),
    (currentText) => applyGrammarRules(currentText, { mode }),
    (currentText) => applyPunctuationFixes(currentText, { mode }),
  ];

  let workingText = text;
  let techniquesUsed = [];

  stages.forEach((runStage, index) => {
    const result = index === 0 ? runStage() : runStage(workingText);
    workingText = result.text;
    techniquesUsed = techniquesUsed.concat(result.techniquesUsed || []);
  });

  return {
    text: workingText,
    techniquesUsed: [...new Set(techniquesUsed)],
  };
}

module.exports = {
  preprocessText,
};
