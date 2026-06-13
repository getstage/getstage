import { app, BrowserWindow, dialog, shell } from "electron";
import { autoUpdater } from "electron-updater";
import { IPC_CHANNELS } from "@shared/ipc/channels";
import type { DesktopUpdateStatus } from "@shared/models/desktop";
import { logDesktopInfo, logDesktopWarn, shouldLogDesktopVerbose } from "./desktop-log";

type UpdateCheckOptions = {
  manual?: boolean;
};

const RELEASES_PAGE_URL = "https://github.com/getstage/getstage/releases/latest";
const GITHUB_OWNER = "getstage";
const GITHUB_REPO = "getstage";
/** Wait until the main window is visible before the first automatic check. */
const AUTO_CHECK_DELAY_MS = 3_000;
/** Avoid hammering the update feed when macOS re-activates the app. */
const AUTO_CHECK_COOLDOWN_MS = 4 * 60 * 60 * 1000;

let checkInFlight = false;
let feedConfigured = false;
let initialAutoCheckScheduled = false;
let lastAutomaticCheckAt = 0;
let availableUpdateVersion: string | null = null;

function logUpdate(message: string) {
  logDesktopInfo("stage-update", message);
}

function logUpdateWarning(message: string) {
  logDesktopWarn("stage-update", message);
}

function configureAutoUpdaterFeed() {
  if (feedConfigured) {
    return;
  }

  const genericBaseUrl = process.env.STAGE_DESKTOP_UPDATES_URL?.trim().replace(/\/+$/, "");
  const githubToken = process.env.STAGE_UPDATE_GITHUB_TOKEN?.trim();

  if (genericBaseUrl) {
    autoUpdater.setFeedURL({
      provider: "generic",
      url: `${genericBaseUrl}/`,
    });
    logUpdate(`using generic feed ${genericBaseUrl}`);
    feedConfigured = true;
    return;
  }

  if (githubToken) {
    autoUpdater.setFeedURL({
      provider: "github",
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      private: true,
      token: githubToken,
    });
    logUpdate("using private GitHub releases feed");
    feedConfigured = true;
    return;
  }

  logUpdateWarning(
    "No STAGE_DESKTOP_UPDATES_URL or STAGE_UPDATE_GITHUB_TOKEN — update checks may fail on a private repo.",
  );
  feedConfigured = true;
}

function getDesktopUpdateStatus(): DesktopUpdateStatus {
  return {
    currentVersion: app.getVersion(),
    availableVersion: availableUpdateVersion ?? undefined,
    isChecking: checkInFlight,
  };
}

function broadcastUpdateStatus() {
  const status = getDesktopUpdateStatus();

  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) {
      window.webContents.send(IPC_CHANNELS.updatesStatusChanged, status);
    }
  }
}

function markUpdateAvailable(version: string) {
  availableUpdateVersion = version;
  broadcastUpdateStatus();
}

function clearAvailableUpdate() {
  availableUpdateVersion = null;
  broadcastUpdateStatus();
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

function isPrivateGithubFeedError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("releases.atom") || message.includes("404");
}

async function showManualCheckError(error: unknown) {
  const privateGithub = isPrivateGithubFeedError(error);
  const { response } = await dialog.showMessageBox({
    type: "warning",
    buttons: privateGithub ? ["Open Download Page", "OK"] : ["OK"],
    defaultId: 0,
    cancelId: privateGithub ? 1 : 0,
    title: "Update Check Failed",
    message: privateGithub
      ? "Stage could not reach the private GitHub release feed."
      : "Stage could not check for updates right now.",
    detail: privateGithub
      ? "Open the download page in your browser (sign in to GitHub if asked), then install the latest Stage.dmg."
      : error instanceof Error
        ? error.message
        : "Could not reach the update server.",
  });

  if (privateGithub && response === 0) {
    await shell.openExternal(RELEASES_PAGE_URL);
  }
}

async function downloadUpdateVersion(version: string) {
  await dialog.showMessageBox({
    type: "info",
    title: "Downloading Update",
    message: `Downloading Stage ${version}...`,
    detail: "Stage will ask you to restart when the download is ready.",
  });

  await autoUpdater.downloadUpdate();
}

export async function checkForUpdates(options: UpdateCheckOptions = {}) {
  const manual = options.manual ?? false;

  if (!app.isPackaged) {
    if (manual) {
      await dialog.showMessageBox({
        type: "info",
        title: "Development Build",
        message: "Updates are only available in packaged Stage builds.",
      });
    }
    return getDesktopUpdateStatus();
  }

  if (checkInFlight) {
    if (manual) {
      await dialog.showMessageBox({
        type: "info",
        title: "Update Check Running",
        message: "Stage is already checking for updates.",
      });
    }
    return getDesktopUpdateStatus();
  }

  configureAutoUpdaterFeed();
  checkInFlight = true;
  broadcastUpdateStatus();

  try {
    logUpdate(manual ? "manual update check started" : "automatic update check started");
    const result = await autoUpdater.checkForUpdates();
    const nextVersion = result?.updateInfo?.version;
    const hasNewerVersion =
      typeof nextVersion === "string" && nextVersion !== app.getVersion();

    if (!hasNewerVersion) {
      clearAvailableUpdate();
      if (manual) {
        await showManualUpToDateDialog();
      } else {
        logUpdate(`up to date (${app.getVersion()})`);
      }
      return getDesktopUpdateStatus();
    }

    markUpdateAvailable(nextVersion);
    logUpdate(`update available: ${nextVersion}`);

    const shouldDownload = await promptDownloadUpdate(nextVersion);
    if (!shouldDownload) {
      return getDesktopUpdateStatus();
    }

    await downloadUpdateVersion(nextVersion);
  } catch (error: unknown) {
    logUpdateWarning(error instanceof Error ? error.message : "unknown update check error");
    if (manual) {
      await showManualCheckError(error);
    }
  } finally {
    checkInFlight = false;
    broadcastUpdateStatus();
    if (!manual) {
      lastAutomaticCheckAt = Date.now();
    }
  }

  return getDesktopUpdateStatus();
}

export async function installAvailableUpdate() {
  if (!app.isPackaged) {
    return getDesktopUpdateStatus();
  }

  const version = availableUpdateVersion;
  if (!version) {
    return getDesktopUpdateStatus();
  }

  const shouldDownload = await promptDownloadUpdate(version);
  if (!shouldDownload) {
    return getDesktopUpdateStatus();
  }

  configureAutoUpdaterFeed();
  checkInFlight = true;
  broadcastUpdateStatus();

  try {
    await downloadUpdateVersion(version);
  } catch (error: unknown) {
    logUpdateWarning(error instanceof Error ? error.message : "unknown update download error");
    await showManualCheckError(error);
  } finally {
    checkInFlight = false;
    broadcastUpdateStatus();
  }

  return getDesktopUpdateStatus();
}

export function getDesktopUpdateStatusForRenderer() {
  return getDesktopUpdateStatus();
}

function scheduleInitialAutomaticUpdateCheck() {
  if (initialAutoCheckScheduled || process.env.STAGE_DISABLE_AUTO_UPDATE_CHECK === "1") {
    return;
  }

  initialAutoCheckScheduled = true;
  setTimeout(() => {
    void checkForUpdates({ manual: false });
  }, AUTO_CHECK_DELAY_MS);
}

export function onMainWindowReady() {
  scheduleInitialAutomaticUpdateCheck();
}

export function scheduleAutomaticUpdateCheckIfDue() {
  if (!app.isPackaged || process.env.STAGE_DISABLE_AUTO_UPDATE_CHECK === "1") {
    return;
  }

  if (availableUpdateVersion || checkInFlight) {
    return;
  }

  if (Date.now() - lastAutomaticCheckAt < AUTO_CHECK_COOLDOWN_MS) {
    return;
  }

  void checkForUpdates({ manual: false });
}

export function initAutoUpdates() {
  if (!app.isPackaged) {
    return;
  }

  configureAutoUpdaterFeed();
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;

  if (!shouldLogDesktopVerbose()) {
    autoUpdater.logger = {
      info: () => undefined,
      warn: (message) => logUpdateWarning(String(message)),
      error: (message) => logUpdateWarning(String(message)),
      debug: () => undefined,
    };
  }

  autoUpdater.on("update-available", (info) => {
    if (typeof info.version === "string" && info.version !== app.getVersion()) {
      markUpdateAvailable(info.version);
      logUpdate(`update-available event: ${info.version}`);
    }
  });

  autoUpdater.on("update-downloaded", (info) => {
    logUpdate(`downloaded ${info.version}`);
    void promptRestartToUpdate(info.version);
  });

  autoUpdater.on("error", (error) => {
    logUpdateWarning(error.message);
  });
}
