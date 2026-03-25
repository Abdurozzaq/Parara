const request = require("supertest");

const app = require("../src/app");

describe("Parara API", () => {
  let accessToken = "";

  beforeAll(async () => {
    const loginResponse = await request(app).post("/auth/login").send({
      serial: "PARARA-DEMO-001",
    });

    expect(loginResponse.statusCode).toBe(200);
    accessToken = loginResponse.body.token;
  });

  afterAll(async () => {
    if (!accessToken) {
      return;
    }

    await request(app)
      .post("/auth/logout")
      .set("Authorization", `Bearer ${accessToken}`);
  });

  test("GET /health returns service status", async () => {
    const response = await request(app).get("/health");

    expect(response.statusCode).toBe(200);
    expect(response.body.status).toBe("ok");
  });

  test("POST /paraphrase returns Indonesian paraphrase payload", async () => {
    const response = await request(app)
      .post("/paraphrase")
      .set("Authorization", `Bearer ${accessToken}`)
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
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        text: "Platform Parara membantu pengguna meningkatkan kualitas tulisan mereka.",
        mode: "akademik",
        strength: 5,
        preserve_keywords: ["Parara"],
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.paraphrased).toContain("Parara");
  });

  test("POST /paraphrase validates bad request payloads", async () => {
    const response = await request(app)
      .post("/paraphrase")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        text: "",
        mode: "bebas",
        strength: 10,
      });

    expect(response.statusCode).toBe(400);
    expect(response.body.error).toBeTruthy();
  });
});
