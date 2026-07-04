import { app, BrowserWindow, dialog, shell } from "electron";
import { autoUpdater } from "electron-updater";
import { IPC_CHANNELS } from "@shared/ipc/channels";
import type { DesktopUpdateStatus } from "@shared/models/desktop";
import {
  getDesktopLogFilePathForUser,
  logDesktopInfo,
  logDesktopWarn,
  shouldLogDesktopVerbose,
} from "./desktop-log";

type UpdateCheckOptions = {
  manual?: boolean;
};

const RELEASES_PAGE_URL = "https://github.com/getstage/getstage/releases/latest";
const GITHUB_OWNER = "getstage";
const GITHUB_REPO = "getstage";
const GITHUB_LATEST_RELEASE_API_URL =
  `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;
/** Wait until the main window is visible before the first automatic check. */
const AUTO_CHECK_DELAY_MS = 3_000;
/** Avoid hammering the update feed when macOS re-activates the app. */
const AUTO_CHECK_COOLDOWN_MS = 4 * 60 * 60 * 1000;

let checkInFlight = false;
let feedConfigured = false;
let initialAutoCheckScheduled = false;
let lastAutomaticCheckAt = 0;
let availableUpdateVersion: string | null = null;
let updateDownloaded = false;
let prepareQuitForUpdate: (() => Promise<void> | void) | null = null;

type GithubReleaseResponse = {
  html_url?: unknown;
  tag_name?: unknown;
};

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

  autoUpdater.setFeedURL({
    provider: "github",
    owner: GITHUB_OWNER,
    repo: GITHUB_REPO,
    private: false,
  });
  logUpdate("using public GitHub releases feed");
  feedConfigured = true;
}

function getDesktopUpdateStatus(): DesktopUpdateStatus {
  return {
    currentVersion: app.getVersion(),
    availableVersion: availableUpdateVersion ?? undefined,
    isChecking: checkInFlight,
    downloaded: updateDownloaded,
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
  updateDownloaded = false;
  broadcastUpdateStatus();
}

export function setUpdateQuitPreparation(handler: () => Promise<void> | void) {
  prepareQuitForUpdate = handler;
}

function parseVersion(version: string) {
  return version
    .replace(/^v/i, "")
    .split(".")
    .map((part) => Number.parseInt(part, 10));
}

function isVersionNewer(nextVersion: string, currentVersion: string) {
  const nextParts = parseVersion(nextVersion);
  const currentParts = parseVersion(currentVersion);
  const length = Math.max(nextParts.length, currentParts.length);

  for (let index = 0; index < length; index += 1) {
    const next = nextParts[index] ?? 0;
    const current = currentParts[index] ?? 0;

    if (!Number.isFinite(next) || !Number.isFinite(current)) {
      return nextVersion !== currentVersion;
    }

    if (next > current) {
      return true;
    }

    if (next < current) {
      return false;
    }
  }

  return false;
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
    if (prepareQuitForUpdate) {
      try {
        await prepareQuitForUpdate();
      } catch (error: unknown) {
        logUpdateWarning(error instanceof Error ? error.message : "update quit preparation failed");
      }
    }
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

function isGithubFeedError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("ERR_FAILED") ||
    message.includes("releases.atom") ||
    message.includes("github.com") ||
    message.includes("404")
  );
}

async function showManualCheckError(error: unknown) {
  const githubFeedError = isGithubFeedError(error);
  const logFilePath = getDesktopLogFilePathForUser();
  const detail = error instanceof Error
    ? error.message
    : "Could not reach the update server.";
  const { response } = await dialog.showMessageBox({
    type: "warning",
    buttons: githubFeedError ? ["Open Download Page", "Show Logs", "OK"] : ["Show Logs", "OK"],
    defaultId: 0,
    cancelId: githubFeedError ? 2 : 1,
    title: "Update Check Failed",
    message: githubFeedError
      ? "Stage could not reach the GitHub update feed."
      : "Stage could not check for updates right now.",
    detail: `${detail}${logFilePath ? `\n\nLogs: ${logFilePath}` : ""}`,
  });

  if (githubFeedError && response === 0) {
    await shell.openExternal(RELEASES_PAGE_URL);
    return;
  }

  const showLogsResponse = githubFeedError ? 1 : 0;
  if (response === showLogsResponse && logFilePath) {
    await shell.showItemInFolder(logFilePath);
  }
}

async function fetchLatestGithubRelease() {
  const headers: Record<string, string> = {
    accept: "application/vnd.github+json",
    "user-agent": "Stage Desktop",
  };
  const githubToken = process.env.STAGE_UPDATE_GITHUB_TOKEN?.trim();
  if (githubToken) {
    headers.authorization = `Bearer ${githubToken}`;
  }

  const response = await fetch(GITHUB_LATEST_RELEASE_API_URL, { headers });
  if (!response.ok) {
    throw new Error(`GitHub latest release request failed with ${response.status}.`);
  }

  const release = (await response.json()) as GithubReleaseResponse;
  const tagName = typeof release.tag_name === "string" ? release.tag_name : "";
  const version = tagName.replace(/^prod-v/i, "").replace(/^v/i, "");
  const url = typeof release.html_url === "string" ? release.html_url : RELEASES_PAGE_URL;

  if (!version) {
    throw new Error("GitHub latest release did not include a version tag.");
  }

  return { url, version };
}

async function showManualFallbackUpdateDialog(version: string, url: string, error: unknown) {
  const logFilePath = getDesktopLogFilePathForUser();
  const detail = error instanceof Error ? error.message : "The automatic update feed failed.";
  const { response } = await dialog.showMessageBox({
    type: "info",
    buttons: ["Open Download Page", "Show Logs", "Not Now"],
    defaultId: 0,
    cancelId: 2,
    title: "Update Available",
    message: `Stage ${version} is available.`,
    detail: `The automatic updater could not use the update feed, but the latest release is available on GitHub.\n\n${detail}${logFilePath ? `\n\nLogs: ${logFilePath}` : ""}`,
  });

  if (response === 0) {
    await shell.openExternal(url);
  } else if (response === 1 && logFilePath) {
    await shell.showItemInFolder(logFilePath);
  }
}

async function handleManualUpdateFallback(error: unknown) {
  try {
    const release = await fetchLatestGithubRelease();
    const currentVersion = app.getVersion();

    if (!isVersionNewer(release.version, currentVersion)) {
      clearAvailableUpdate();
      await showManualUpToDateDialog();
      return true;
    }

    markUpdateAvailable(release.version);
    logUpdate(`fallback update available: ${release.version}`);
    await showManualFallbackUpdateDialog(release.version, release.url, error);
    return true;
  } catch (fallbackError: unknown) {
    logUpdateWarning(
      fallbackError instanceof Error
        ? `fallback update check failed: ${fallbackError.message}`
        : "fallback update check failed",
    );
    return false;
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
      typeof nextVersion === "string" && isVersionNewer(nextVersion, app.getVersion());

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
    // autoDownload is enabled, so checkForUpdates() has already started fetching the
    // update in the background. The `update-downloaded` handler then offers a restart,
    // and autoInstallOnAppQuit applies it on next quit if the user dismisses that prompt.
    logUpdate(`update available: ${nextVersion}; downloading in background`);
  } catch (error: unknown) {
    logUpdateWarning(error instanceof Error ? error.message : "unknown update check error");
    if (manual) {
      const handled = await handleManualUpdateFallback(error);
      if (!handled) {
        await showManualCheckError(error);
      }
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

async function applyDownloadedUpdate() {
  if (prepareQuitForUpdate) {
    try {
      await prepareQuitForUpdate();
    } catch (error: unknown) {
      logUpdateWarning(error instanceof Error ? error.message : "update quit preparation failed");
    }
  }
  autoUpdater.quitAndInstall();
}

export async function installAvailableUpdate() {
  if (!app.isPackaged) {
    return getDesktopUpdateStatus();
  }

  // Already downloaded in the background → restart straight into it, no re-download.
  if (updateDownloaded) {
    await applyDownloadedUpdate();
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
  // Silent background updates (like Chrome / VS Code): download automatically and
  // install on next quit, so users never have to manually delete + re-download.
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

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
    updateDownloaded = true;
    if (typeof info.version === "string") {
      markUpdateAvailable(info.version);
    } else {
      broadcastUpdateStatus();
    }
    void promptRestartToUpdate(info.version);
  });

  autoUpdater.on("error", (error) => {
    logUpdateWarning(error.message);
  });
}
