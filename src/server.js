const app = require("./app");

function formatServerUrl(host, port) {
  if (!host) {
    return `http://localhost:${port}`;
  }

  if (host.includes(":")) {
    return `http://[${host}]:${port}`;
  }

  return `http://${host}:${port}`;
}

function startServer(options = {}) {
  const envPort = Number(process.env.PORT);
  const requestedPort =
    options.port ?? (Number.isInteger(envPort) && envPort > 0 ? envPort : 3000);
  const requestedHost = options.host ?? process.env.HOST;

  return new Promise((resolve, reject) => {
    const onListening = () => {
      server.off("error", onError);

      const address = server.address();
      const port = typeof address === "object" && address ? address.port : requestedPort;
      const host =
        typeof address === "object" && address ? address.address : requestedHost || "127.0.0.1";

      console.log(`Parara API aktif di ${formatServerUrl(host, port)}`);
      resolve({
        server,
        host,
        port,
        url: formatServerUrl(host, port),
      });
    };

    const onError = (error) => {
      reject(error);
    };

    const server = requestedHost
      ? app.listen(requestedPort, requestedHost, onListening)
      : app.listen(requestedPort, onListening);

    server.once("error", onError);
  });
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error("Gagal menjalankan Parara.", error);
    process.exit(1);
  });
}

module.exports = {
  startServer,
};
