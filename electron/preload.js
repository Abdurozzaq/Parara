const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("pararaDesktop", {
  isDesktopApp: true,
  platform: process.platform,
});
