const path = require("path");
const { app, BrowserWindow, dialog } = require("electron");

const { startServer } = require("../src/server");

const appIconPath = path.join(__dirname, "..", "assets", "parara.ico");

let mainWindow = null;
let serverHandle = null;
let isQuitting = false;

function createMainWindow(targetUrl) {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 1024,
    minHeight: 720,
    icon: appIconPath,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  return mainWindow.loadURL(targetUrl);
}

async function closeLocalServer() {
  if (!serverHandle) {
    return;
  }

  const activeServer = serverHandle.server;
  serverHandle = null;

  await new Promise((resolve, reject) => {
    activeServer.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

async function bootstrapDesktopApp() {
  try {
    serverHandle = await startServer({
      port: 0,
      host: "127.0.0.1",
    });

    await createMainWindow(serverHandle.url);
  } catch (error) {
    dialog.showErrorBox(
      "Parara gagal dibuka",
      `Desktop app tidak bisa menjalankan server lokal.\n\n${error.message}`,
    );
    app.quit();
  }
}

app.whenReady().then(bootstrapDesktopApp);

app.on("activate", () => {
  if (!mainWindow && serverHandle) {
    createMainWindow(serverHandle.url);
  }
});

app.on("before-quit", () => {
  isQuitting = true;
});

app.on("window-all-closed", async () => {
  if (process.platform === "darwin" && !isQuitting) {
    return;
  }

  try {
    await closeLocalServer();
  } catch (error) {
    console.error("Gagal menutup server lokal Parara.", error);
  }

  app.quit();
});
