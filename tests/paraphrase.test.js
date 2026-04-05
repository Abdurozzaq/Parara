const request = require("supertest");

const app = require("../src/app");

describe("Parara API", () => {
  test("GET /health returns service status", async () => {
    const response = await request(app).get("/health");

    expect(response.statusCode).toBe(200);
    expect(response.body.status).toBe("ok");
  });

  test("POST /paraphrase returns Indonesian paraphrase payload", async () => {
    const response = await request(app)
      .post("/paraphrase")
      .send({
        text: "Oleh karena itu, sistem ini membantu pengguna menyelesaikan masalah dengan cepat.",
        mode: "formal",
        strength: 4,
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.original).toContain("sistem ini");
    expect(response.body.paraphrased).not.toEqual(response.body.original);
    expect(Array.isArray(response.body.techniques_used)).toBe(true);
    expect(typeof response.body.similarity_score).toBe("number");
  });

  test("POST /paraphrase preserves requested keywords", async () => {
    const response = await request(app)
      .post("/paraphrase")
      .send({
        text: "Platform Parara membantu pengguna meningkatkan kualitas tulisan mereka.",
        mode: "akademik",
        strength: 8,
        preserve_keywords: ["Parara"],
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.paraphrased).toContain("Parara");
  });

  test("POST /paraphrase accepts the new maximum strength", async () => {
    const response = await request(app)
      .post("/paraphrase")
      .send({
        text: "Sistem ini membantu pengguna menyusun ulang kalimat dengan hasil yang lebih variatif.",
        mode: "formal",
        strength: 8,
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.paraphrased).toBeTruthy();
    expect(typeof response.body.similarity_score).toBe("number");
  });

  test("POST /paraphrase applies correction pipeline before paraphrasing", async () => {
    const response = await request(app)
      .post("/paraphrase")
      .send({
        text: "sistim ini gak cepet banget",
        mode: "formal",
        strength: 2,
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.techniques_used).toEqual(
      expect.arrayContaining([
        "text_normalization",
        "typo_correction",
        "grammar_fix",
        "punctuation_fix",
      ]),
    );
    expect(response.body.paraphrased).not.toMatch(/\bsistim\b/i);
    expect(response.body.paraphrased).not.toMatch(/\bgak\b/i);
    expect(response.body.paraphrased).not.toMatch(/\bcepet\b/i);
  });

  test("POST /paraphrase validates bad request payloads", async () => {
    const response = await request(app)
      .post("/paraphrase")
      .send({
        text: "",
        mode: "bebas",
        strength: 10,
      });

    expect(response.statusCode).toBe(400);
    expect(response.body.error).toBeTruthy();
  });
});
