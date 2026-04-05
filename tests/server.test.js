const http = require("http");

const { startServer } = require("../src/server");

describe("Parara server bootstrap", () => {
  let serverHandle = null;

  afterEach(async () => {
    if (!serverHandle) {
      return;
    }

    await new Promise((resolve, reject) => {
      serverHandle.server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });

    serverHandle = null;
  });

  test("startServer starts on a dynamic port and serves health checks", async () => {
    serverHandle = await startServer({
      port: 0,
      host: "127.0.0.1",
    });

    const payload = await new Promise((resolve, reject) => {
      http
        .get(`${serverHandle.url}/health`, (response) => {
          let body = "";

          response.on("data", (chunk) => {
            body += chunk;
          });

          response.on("end", () => {
            resolve({
              statusCode: response.statusCode,
              body: JSON.parse(body),
            });
          });
        })
        .on("error", reject);
    });

    expect(serverHandle.port).toBeGreaterThan(0);
    expect(payload.statusCode).toBe(200);
    expect(payload.body.status).toBe("ok");
  });
});
