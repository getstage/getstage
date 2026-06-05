import { app, dialog } from "electron";
import { autoUpdater } from "electron-updater";

type UpdateCheckOptions = {
  manual?: boolean;
};

let checkInFlight = false;

function logUpdate(message: string) {
  console.info(`[stage-update] ${message}`);
}

function logUpdateWarning(message: string) {
  console.warn(`[stage-update] ${message}`);
}

async function promptDownloadUpdate(version: string) {
  const { response } = await dialog.showMessageBox({
    type: "info",
    buttons: ["Download", "Not Now"],
    defaultId: 0,
    cancelId: 1,
    title: "Update Available",
    message: `Stage ${version} is available.`,
    detail: `You are on ${app.getVersion()}. Download and install the update now?`,
  });

  return response === 0;
}

async function promptRestartToUpdate(version: string) {
  const { response } = await dialog.showMessageBox({
    type: "info",
    buttons: ["Restart Now", "Later"],
    defaultId: 0,
    cancelId: 1,
    title: "Update Ready",
    message: `Stage ${version} is ready to install.`,
    detail: "Restart Stage to finish updating.",
  });

  if (response === 0) {
    autoUpdater.quitAndInstall();
  }
}

async function showManualUpToDateDialog() {
  await dialog.showMessageBox({
    type: "info",
    title: "Stage is Up to Date",
    message: `You're on the latest version (${app.getVersion()}).`,
  });
}

async function showManualCheckError(error: unknown) {
  const detail =
    error instanceof Error ? error.message : "Could not reach the update server.";

  await dialog.showMessageBox({
    type: "warning",
    title: "Update Check Failed",
    message: "Stage could not check for updates right now.",
    detail,
  });
}

export async function checkForUpdates(options: UpdateCheckOptions = {}) {
  if (!app.isPackaged) {
    if (options.manual) {
      await dialog.showMessageBox({
        type: "info",
        title: "Development Build",
        message: "Updates are only available in packaged Stage builds.",
      });
    }
    return;
  }

  if (!options.manual) {
    return;
  }

  if (checkInFlight) {
    await dialog.showMessageBox({
      type: "info",
      title: "Update Check Running",
      message: "Stage is already checking for updates.",
    });
    return;
  }

  checkInFlight = true;

  try {
    logUpdate("manual update check started");
    const result = await autoUpdater.checkForUpdates();
    const nextVersion = result?.updateInfo?.version;
    const hasNewerVersion =
      typeof nextVersion === "string" && nextVersion !== app.getVersion();

    if (!hasNewerVersion) {
      await showManualUpToDateDialog();
      return;
    }

    logUpdate(`update available: ${nextVersion}`);
    const shouldDownload = await promptDownloadUpdate(nextVersion);
    if (!shouldDownload) {
      return;
    }

    await dialog.showMessageBox({
      type: "info",
      title: "Downloading Update",
      message: `Downloading Stage ${nextVersion}...`,
      detail: "Stage will ask you to restart when the download is ready.",
    });

    await autoUpdater.downloadUpdate();
  } catch (error: unknown) {
    logUpdateWarning(error instanceof Error ? error.message : "unknown update check error");
    await showManualCheckError(error);
  } finally {
    checkInFlight = false;
  }
}

export function initAutoUpdates() {
  if (!app.isPackaged) {
    return;
  }

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;

  autoUpdater.on("update-downloaded", (info) => {
    logUpdate(`downloaded ${info.version}`);
    void promptRestartToUpdate(info.version);
  });

  autoUpdater.on("error", (error) => {
    logUpdateWarning(error.message);
  });
}
