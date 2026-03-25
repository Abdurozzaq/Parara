const request = require("supertest");

const app = require("../src/app");

describe("Parara Superadmin API", () => {
  let adminToken = "";

  test("POST /admin/auth/login rejects invalid superadmin serial", async () => {
    const response = await request(app).post("/admin/auth/login").send({
      serial: "not-a-superadmin",
    });

    expect(response.statusCode).toBe(401);
  });

  test("POST /admin/auth/login accepts configured superadmin serial", async () => {
    const response = await request(app).post("/admin/auth/login").send({
      serial: "PARARA-SUPERADMIN-TEST",
    });

    expect(response.statusCode).toBe(200);
    expect(response.body.token).toBeTruthy();
    adminToken = response.body.token;
  });

  test("GET /admin/licenses returns seeded license", async () => {
    const response = await request(app)
      .get("/admin/licenses")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.statusCode).toBe(200);
    expect(Array.isArray(response.body.licenses)).toBe(true);
    expect(response.body.licenses.some((row) => row.serial === "PARARA-DEMO-001")).toBe(true);
  });

  test("POST /admin/licenses creates license", async () => {
    const response = await request(app)
      .post("/admin/licenses")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        serial: "PARARA-TEST-NEW",
        email: "owner@test.local",
      });

    expect(response.statusCode).toBe(201);
    expect(response.body.license?.serial).toBe("PARARA-TEST-NEW");
    expect(response.body.license?.email).toBe("owner@test.local");
  });

  test("POST /admin/licenses rejects duplicate serial", async () => {
    const response = await request(app)
      .post("/admin/licenses")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        serial: "PARARA-TEST-NEW",
        email: "other@test.local",
      });

    expect(response.statusCode).toBe(409);
  });

  test("PUT /admin/licenses/:id updates license", async () => {
    const list = await request(app)
      .get("/admin/licenses")
      .set("Authorization", `Bearer ${adminToken}`);

    const target = list.body.licenses.find((row) => row.serial === "PARARA-TEST-NEW");
    expect(target).toBeTruthy();

    const response = await request(app)
      .put(`/admin/licenses/${target.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        serial: "PARARA-TEST-UPDATED",
        email: "updated@test.local",
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.license?.serial).toBe("PARARA-TEST-UPDATED");
  });

  test("DELETE /admin/licenses/:id removes license", async () => {
    const list = await request(app)
      .get("/admin/licenses")
      .set("Authorization", `Bearer ${adminToken}`);

    const target = list.body.licenses.find((row) => row.serial === "PARARA-TEST-UPDATED");
    expect(target).toBeTruthy();

    const response = await request(app)
      .delete(`/admin/licenses/${target.id}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.statusCode).toBe(200);
  });

  test("POST /admin/auth/logout clears admin session", async () => {
    const response = await request(app)
      .post("/admin/auth/logout")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.statusCode).toBe(200);

    const gated = await request(app)
      .get("/admin/licenses")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(gated.statusCode).toBe(401);
  });
});
