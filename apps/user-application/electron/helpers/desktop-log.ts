import { app } from "electron";
import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

type ConsoleMethod = "error" | "info" | "log" | "warn";

const originalConsole: Record<ConsoleMethod, (...args: unknown[]) => void> = {
  error: console.error.bind(console),
  info: console.info.bind(console),
  log: console.log.bind(console),
  warn: console.warn.bind(console),
};

let hasInstalledSafeConsole = false;
let hasDisabledConsoleSink = false;
let hasDisabledFileSink = false;
let cachedLogFilePath: string | null | undefined;

/** Verbose desktop main-process logs (sidecar lifecycle, auth steps, update checks). */
export function shouldLogDesktopVerbose() {
  return (
    process.env.STAGE_DESKTOP_DEBUG === "1" ||
    (!app.isPackaged && process.env.STAGE_DESKTOP_DEBUG !== "0")
  );
}

function formatLogValue(value: unknown) {
  if (value instanceof Error) {
    return value.stack ?? value.message;
  }

  if (typeof value === "string") {
    return value;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function getDesktopLogFilePath() {
  if (cachedLogFilePath !== undefined) {
    return cachedLogFilePath;
  }

  try {
    app.setAppLogsPath();
  } catch {
    // Keep logging best-effort; app.getPath("logs") may still work.
  }

  const candidateDirectories: string[] = [];

  try {
    candidateDirectories.push(app.getPath("logs"));
  } catch {
    // Fall back below.
  }

  try {
    candidateDirectories.push(join(app.getPath("userData"), "logs"));
  } catch {
    // No usable Electron path yet.
  }

  for (const directory of candidateDirectories) {
    try {
      mkdirSync(directory, { recursive: true });
      cachedLogFilePath = join(directory, "main.log");
      return cachedLogFilePath;
    } catch {
      // Try the next candidate.
    }
  }

  cachedLogFilePath = null;
  return cachedLogFilePath;
}

function appendDesktopLogLine(level: ConsoleMethod, args: unknown[]) {
  if (hasDisabledFileSink) {
    return;
  }

  const logFilePath = getDesktopLogFilePath();
  if (!logFilePath) {
    return;
  }

  const message = args.map(formatLogValue).join(" ");
  const line = `${new Date().toISOString()} ${level.toUpperCase()} ${message}\n`;

  try {
    appendFileSync(logFilePath, line, "utf8");
  } catch {
    hasDisabledFileSink = true;
  }
}

function writeOriginalConsole(method: ConsoleMethod, args: unknown[]) {
  if (hasDisabledConsoleSink) {
    return;
  }

  try {
    originalConsole[method](...args);
  } catch (error) {
    hasDisabledConsoleSink = true;
    appendDesktopLogLine("warn", [
      `console.${method} disabled after write failure: ${formatLogValue(error)}`,
    ]);
  }
}

function writeDesktopLog(method: ConsoleMethod, args: unknown[]) {
  appendDesktopLogLine(method, args);
  writeOriginalConsole(method, args);
}

export function installSafeDesktopLogging() {
  if (hasInstalledSafeConsole) {
    return;
  }

  hasInstalledSafeConsole = true;

  console.error = (...args: unknown[]) => writeDesktopLog("error", args);
  console.info = (...args: unknown[]) => writeDesktopLog("info", args);
  console.log = (...args: unknown[]) => writeDesktopLog("log", args);
  console.warn = (...args: unknown[]) => writeDesktopLog("warn", args);
}

export function logDesktopDebug(message: string) {
  if (shouldLogDesktopVerbose()) {
    writeDesktopLog("info", [`[stage-desktop:debug] ${message}`]);
  }
}

export function logDesktopInfo(tag: string, message: string) {
  if (shouldLogDesktopVerbose()) {
    writeDesktopLog("info", [`[${tag}] ${message}`]);
  }
}

export function logDesktopWarn(tag: string, message: string) {
  writeDesktopLog("warn", [`[${tag}] ${message}`]);
}
