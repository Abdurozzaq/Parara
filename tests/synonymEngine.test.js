const { applySynonyms } = require("../src/services/synonymEngine");

describe("synonymEngine bidirectional synonyms", () => {
  test("can replace a word that previously existed only as a replacement", () => {
    // "krusial" is a replacement of "penting" in synonyms.json.
    // With bidirectional expansion, "krusial" becomes a valid source too.
    const rng = () => 0; // always pass probability checks, always pick first option

    const result = applySynonyms("krusial", {
      mode: "formal",
      strength: 8,
      rng,
    });

    expect(result.text).toBe("penting");
    expect(result.techniquesUsed).toEqual(["synonym_replacement"]);
  });
});

