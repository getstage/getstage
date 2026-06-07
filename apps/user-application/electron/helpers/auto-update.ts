import { app, dialog, shell } from "electron";
import { autoUpdater } from "electron-updater";

type UpdateCheckOptions = {
  manual?: boolean;
};

const RELEASES_PAGE_URL = "https://github.com/getstage/getstage/releases/latest";
const GITHUB_OWNER = "getstage";
const GITHUB_REPO = "getstage";
/** Delay automatic checks so startup is not blocked by network I/O. */
const AUTO_CHECK_DELAY_MS = 10_000;

let checkInFlight = false;
let feedConfigured = false;
let autoCheckScheduled = false;

function logUpdate(message: string) {
  console.info(`[stage-update] ${message}`);
}

function logUpdateWarning(message: string) {
  console.warn(`[stage-update] ${message}`);
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
    return;
  }

  if (checkInFlight) {
    if (manual) {
      await dialog.showMessageBox({
        type: "info",
        title: "Update Check Running",
        message: "Stage is already checking for updates.",
      });
    }
    return;
  }

  configureAutoUpdaterFeed();
  checkInFlight = true;

  try {
    logUpdate(manual ? "manual update check started" : "automatic update check started");
    const result = await autoUpdater.checkForUpdates();
    const nextVersion = result?.updateInfo?.version;
    const hasNewerVersion =
      typeof nextVersion === "string" && nextVersion !== app.getVersion();

    if (!hasNewerVersion) {
      if (manual) {
        await showManualUpToDateDialog();
      } else {
        logUpdate(`up to date (${app.getVersion()})`);
      }
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
    if (manual) {
      await showManualCheckError(error);
    }
  } finally {
    checkInFlight = false;
  }
}

function scheduleAutomaticUpdateCheck() {
  if (autoCheckScheduled || process.env.STAGE_DISABLE_AUTO_UPDATE_CHECK === "1") {
    return;
  }

  autoCheckScheduled = true;
  setTimeout(() => {
    void checkForUpdates({ manual: false });
  }, AUTO_CHECK_DELAY_MS);
}

export function initAutoUpdates() {
  if (!app.isPackaged) {
    return;
  }

  configureAutoUpdaterFeed();
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;

  autoUpdater.on("update-downloaded", (info) => {
    logUpdate(`downloaded ${info.version}`);
    void promptRestartToUpdate(info.version);
  });

  autoUpdater.on("error", (error) => {
    logUpdateWarning(error.message);
  });

  scheduleAutomaticUpdateCheck();
}
