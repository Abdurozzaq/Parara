const { preprocessText } = require("../src/services/preprocessEngine");
const { applyNormalization } = require("../src/services/normalizationService");
const { applyTypoCorrections } = require("../src/services/typoService");
const { applyGrammarRules } = require("../src/services/grammarService");
const { applyPunctuationFixes, formatSentences } = require("../src/services/punctuationService");

describe("Indonesian preprocessing pipeline", () => {
  test("normalizes informal Indonesian words for formal mode", () => {
    const result = applyNormalization("gak cepet banget", { mode: "formal" });

    expect(result.text).toBe("tidak cepat sekali");
    expect(result.techniquesUsed).toContain("text_normalization");
  });

  test("joins broken continuation sentences after a period", () => {
    const result = preprocessText(
      "Lebih lanjut, saya sempat melakukan pengamatan awal di Madrasah Aliyah Tafriijul Ahkam. Dan mengidentifikasi beberapa hambatan yang lumayan klasik. ",
      { mode: "formal" },
    );

    expect(result.text).toBe(
      "Lebih lanjut, saya sempat melakukan pengamatan awal di Madrasah Aliyah Tafriijul Ahkam dan mengidentifikasi beberapa hambatan yang lumayan klasik.",
    );
    expect(result.techniquesUsed).toContain("text_normalization");
    expect(result.techniquesUsed).toContain("punctuation_fix");
  });

  test("corrects obvious typos using local dictionary lookup", () => {
    const result = applyTypoCorrections("sistim resiko");

    expect(result.text).toBe("sistem risiko");
    expect(result.techniquesUsed).toContain("typo_correction");
  });

  test("fixes conservative grammar patterns", () => {
    const result = applyGrammarRules("tidak cepat sekali dan agar supaya rapi");

    expect(result.text).toBe("tidak terlalu cepat dan agar rapi");
    expect(result.techniquesUsed).toContain("grammar_fix");
  });

  test("repairs punctuation and sentence casing", () => {
    const result = applyPunctuationFixes("halo , dunia");

    expect(result.text).toBe("Halo, dunia.");
    expect(result.techniquesUsed).toContain("punctuation_fix");
  });

  test("normalizes sentence joiners during final punctuation formatting", () => {
    const result = formatSentences(
      "Lebih lanjut, kita bisa melihat secara mandiri bagaimana kemajuan teknologi. Dan komunikasi perlahan tapi pasti akan memodifikasi taktik kita belajar.",
    );

    expect(result).toBe(
      "Lebih lanjut, kita bisa melihat secara mandiri bagaimana kemajuan teknologi dan komunikasi perlahan tapi pasti akan memodifikasi taktik kita belajar.",
    );
  });

  test("adds a comma before dan for lists with three items", () => {
    const result = formatSentences("Sistem ini membantu riset, penulisan dan evaluasi");

    expect(result).toBe("Sistem ini membantu riset, penulisan, dan evaluasi.");
  });

  test("does not add a comma before dan for two-item pairs", () => {
    const result = formatSentences("Sistem ini membantu riset dan evaluasi");

    expect(result).toBe("Sistem ini membantu riset dan evaluasi.");
  });

  test("does not treat discourse pauses as serial lists", () => {
    const result = formatSentences(
      "Lebih lanjut, kita bisa melihat secara mandiri bagaimana kemajuan teknologi, dan komunikasi perlahan tapi pasti akan memodifikasi taktik kita belajar",
    );

    expect(result).toBe(
      "Lebih lanjut, kita bisa melihat secara mandiri bagaimana kemajuan teknologi dan komunikasi perlahan tapi pasti akan memodifikasi taktik kita belajar.",
    );
  });

  test("does not treat common discourse markers as list items", () => {
    const result = formatSentences(
      "Selain itu, sistem ini membantu penulis, dan pengguna dapat meninjau hasilnya secara mandiri",
    );

    expect(result).toBe(
      "Selain itu, sistem ini membantu penulis dan pengguna dapat meninjau hasilnya secara mandiri.",
    );
  });

  test("runs normalization, typo, grammar, and punctuation in one pass", () => {
    const result = preprocessText("sistim ini gak cepet banget", { mode: "formal" });

    expect(result.text).toBe("Sistem ini tidak terlalu cepat.");
    expect(result.techniquesUsed).toEqual([
      "text_normalization",
      "typo_correction",
      "grammar_fix",
      "punctuation_fix",
    ]);
  });
});
