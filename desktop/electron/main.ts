import { app } from "electron";
import { registerIpcHandlers } from "./ipc";
import { createMainWindow } from "./windows";

app.setName("Stage");

if (!app.requestSingleInstanceLock()) {
  app.quit();
}

app.whenReady().then(() => {
  registerIpcHandlers();
  createMainWindow();

  app.on("activate", () => {
    createMainWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
