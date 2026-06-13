import { app } from "electron";

/** Verbose desktop main-process logs (sidecar lifecycle, auth steps, update checks). */
export function shouldLogDesktopVerbose() {
  return (
    process.env.STAGE_DESKTOP_DEBUG === "1" ||
    (!app.isPackaged && process.env.STAGE_DESKTOP_DEBUG !== "0")
  );
}

export function logDesktopDebug(message: string) {
  if (shouldLogDesktopVerbose()) {
    console.info(`[stage-desktop:debug] ${message}`);
  }
}

export function logDesktopInfo(tag: string, message: string) {
  if (shouldLogDesktopVerbose()) {
    console.info(`[${tag}] ${message}`);
  }
}

export function logDesktopWarn(tag: string, message: string) {
  console.warn(`[${tag}] ${message}`);
}
