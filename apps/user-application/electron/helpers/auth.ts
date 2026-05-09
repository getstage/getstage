import { app } from "electron";
import { join } from "node:path";
import type { DesktopSession, DesktopStoredSession } from "@shared/models/desktop";

export const STAGE_PROTOCOL = "stage";
export const DESKTOP_AUTH_PATH = "auth";
export const DEV_DESKTOP_AUTH_CALLBACK_HOST = "127.0.0.1";
export const DEV_DESKTOP_AUTH_CALLBACK_PORT = 48224;
export const DEV_DESKTOP_AUTH_CALLBACK_PATH = "/auth";
export const PRODUCTION_DESKTOP_AUTH_URL = "https://getstage.co/auth/desktop";
export const TESTING_DESKTOP_AUTH_URL = "https://testing.getstage.co/auth/desktop";
export const AUTH_STATE_TTL_MS = 10 * 60 * 1000;
export const DESKTOP_SESSION_FILE_NAME = "desktop-auth-session.json";
export const DESKTOP_SESSION_STORAGE_VERSION = 1;

export type PendingAuthAttempt = {
  createdAt: number;
  state: string;
};

export type AuthCallbackResult =
  | { ok: true; session: DesktopSession }
  | { error: string; ok: false };

export type StoredSessionFile = {
  encrypted: boolean;
  payload: string;
  version: typeof DESKTOP_SESSION_STORAGE_VERSION;
};

export function authStatePath() {
  return join(app.getPath("userData"), "desktop-auth-state.json");
}

export function authSessionPath() {
  return join(app.getPath("userData"), DESKTOP_SESSION_FILE_NAME);
}

export function getDesktopAuthUrl() {
  if (process.env.STAGE_DESKTOP_AUTH_URL) {
    return process.env.STAGE_DESKTOP_AUTH_URL;
  }

  return app.isPackaged ? PRODUCTION_DESKTOP_AUTH_URL : TESTING_DESKTOP_AUTH_URL;
}

export function toPublicSession(session: DesktopStoredSession): DesktopSession {
  return {
    avatarUrl: session.avatarUrl,
    email: session.email,
    expiresAt: session.expiresAt,
    hasAccessToken: Boolean(session.accessToken),
    name: session.name,
    userId: session.userId,
  };
}

export function getDesktopAuthRedirectUri() {
  if (!app.isPackaged) {
    return `http://${DEV_DESKTOP_AUTH_CALLBACK_HOST}:${DEV_DESKTOP_AUTH_CALLBACK_PORT}${DEV_DESKTOP_AUTH_CALLBACK_PATH}`;
  }

  return `${STAGE_PROTOCOL}://${DESKTOP_AUTH_PATH}`;
}

export function getStageAuthUrlFromLocalCallback(value: string) {
  const localUrl = new URL(value);
  const stageUrl = new URL(`${STAGE_PROTOCOL}://${DESKTOP_AUTH_PATH}`);

  for (const [key, paramValue] of localUrl.searchParams.entries()) {
    stageUrl.searchParams.set(key, paramValue);
  }

  return stageUrl.toString();
}

export function isStageAuthUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === `${STAGE_PROTOCOL}:` && url.hostname === DESKTOP_AUTH_PATH;
  } catch {
    return false;
  }
}

export function findStageAuthUrl(argv: string[]) {
  return argv.find(isStageAuthUrl) ?? null;
}

export function registerStageProtocol() {
  if (!app.isPackaged) {
    const appPath = app.getAppPath();
    const registered = app.setAsDefaultProtocolClient(STAGE_PROTOCOL, process.execPath, [appPath]);
    console.info(
      `[stage-auth] registered ${STAGE_PROTOCOL}:// protocol for dev app: ${
        registered ? "ok" : "failed"
      }`,
    );
    return;
  }

  const registered = app.setAsDefaultProtocolClient(STAGE_PROTOCOL);
  console.info(
    `[stage-auth] registered ${STAGE_PROTOCOL}:// protocol for packaged app: ${
      registered ? "ok" : "failed"
    }`,
  );
}
