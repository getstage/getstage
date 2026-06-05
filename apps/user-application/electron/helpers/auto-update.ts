import { app, dialog } from "electron";
import { autoUpdater } from "electron-updater";

type UpdateCheckOptions = {
  manual?: boolean;
};

let checkInFlight = false;
let manualCheckPending = false;

function logUpdate(message: string) {
  console.info(`[stage-update] ${message}`);
}

function logUpdateWarning(message: string) {
  console.warn(`[stage-update] ${message}`);
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
        message: "Automatic updates are only available in packaged Stage builds.",
      });
    }
    return;
  }

  if (checkInFlight) {
    if (options.manual) {
      await dialog.showMessageBox({
        type: "info",
        title: "Update Check Running",
        message: "Stage is already checking for updates.",
      });
    }
    return;
  }

  checkInFlight = true;
  manualCheckPending = options.manual === true;

  try {
    logUpdate(manualCheckPending ? "manual update check started" : "background update check started");
    const result = await autoUpdater.checkForUpdates();
    const nextVersion = result?.updateInfo?.version;
    const hasNewerVersion =
      typeof nextVersion === "string" && nextVersion !== app.getVersion();

    if (!hasNewerVersion) {
      if (manualCheckPending) {
        await showManualUpToDateDialog();
      } else {
        logUpdate(`up to date (${app.getVersion()})`);
      }
      return;
    }

    logUpdate(`update available: ${nextVersion}`);
    if (manualCheckPending) {
      await dialog.showMessageBox({
        type: "info",
        title: "Update Available",
        message: `Stage ${nextVersion} is downloading now.`,
        detail: "Stage will ask you to restart once the update is ready.",
      });
    }
  } catch (error: unknown) {
    logUpdateWarning(error instanceof Error ? error.message : "unknown update check error");
    if (manualCheckPending) {
      await showManualCheckError(error);
    }
  } finally {
    checkInFlight = false;
    manualCheckPending = false;
  }
}

export function initAutoUpdates() {
  if (!app.isPackaged) {
    return;
  }

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("update-downloaded", (info) => {
    logUpdate(`downloaded ${info.version}`);
    void promptRestartToUpdate(info.version);
  });

  autoUpdater.on("error", (error) => {
    logUpdateWarning(error.message);
  });

  setTimeout(() => {
    void checkForUpdates();
  }, 30_000);

  setInterval(() => {
    void checkForUpdates();
  }, 4 * 60 * 60 * 1000);
}
