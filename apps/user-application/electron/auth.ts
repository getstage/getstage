import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { BrowserWindow, shell } from "electron";
import { IPC_CHANNELS } from "@shared/ipc/channels";
import {
  desktopAuthIdentitySchema,
  desktopStoredSessionSchema,
  type DesktopSession,
  type DesktopStoredSession,
} from "@shared/models/desktop";
import {
  AUTH_STATE_TTL_MS,
  DESKTOP_AUTH_PATH,
  STAGE_PROTOCOL,
  authStatePath,
  getDesktopAuthRedirectUri,
  getDesktopAuthUrl,
  isStageAuthUrl,
  toPublicSession,
  type AuthCallbackResult,
  type PendingAuthAttempt,
} from "./helpers/auth";
import { getDesktopApiBaseUrl } from "./helpers/desktop-api";
import {
  clearStoredSession,
  loadStoredSession,
  saveStoredSession,
} from "./helpers/session-storage";
import { logDesktopInfo } from "./helpers/desktop-log";
import { now } from "./helpers/time";
import { createMainWindow } from "./windows";

export class DesktopAuthController {
  private pendingAuthAttempt: PendingAuthAttempt | null = null;
  private pendingCallbackUrl: string | null = null;
  private storedSession: DesktopStoredSession | null = null;

  async openLogin() {
    const state = randomUUID();
    this.pendingAuthAttempt = {
      createdAt: now(),
      state,
    };
    await this.savePendingAuthAttempt(this.pendingAuthAttempt);

    const loginUrl = new URL(getDesktopAuthUrl());
    loginUrl.searchParams.set("state", state);
    loginUrl.searchParams.set("redirect_uri", getDesktopAuthRedirectUri());

    logDesktopInfo("stage-auth", `opening desktop login at ${loginUrl.origin}${loginUrl.pathname}`);
    await shell.openExternal(loginUrl.toString());
  }

  async getSession() {
    const session = await this.getStoredSession();
    return session ? toPublicSession(session) : null;
  }

  async getAccessToken() {
    const session = await this.getStoredSession();
    return session?.accessToken ?? null;
  }

  async clearSession() {
    this.storedSession = null;
    await clearStoredSession();
  }

  /**
   * Explicit user-initiated sign-out.
   *
   * Clears the stored desktop session AND broadcasts `auth:session-changed`
   * with `null` to every renderer window so the UI immediately drops to
   * the signed-out state. Reused by both the manual Log out button and
   * the automatic clear path that fires when a 401 / 403 is observed.
   */
  async signOut() {
    await this.clearSession();
    BrowserWindow.getAllWindows().forEach((window) => {
      window.webContents.send(IPC_CHANNELS.authSessionChanged, null);
    });
    logDesktopInfo("stage-auth", "desktop session signed out");
  }

  queueCallbackUrl(url: string) {
    if (!isStageAuthUrl(url)) {
      return;
    }

    this.pendingCallbackUrl = url;
  }

  async consumeQueuedCallback() {
    if (!this.pendingCallbackUrl) {
      return null;
    }

    const url = this.pendingCallbackUrl;
    this.pendingCallbackUrl = null;
    return this.handleCallbackUrl(url);
  }

  async handleCallbackUrl(value: string): Promise<AuthCallbackResult> {
    let callbackUrl: URL;

    try {
      callbackUrl = new URL(value);
    } catch {
      return { error: "Invalid desktop auth callback URL.", ok: false };
    }

    if (callbackUrl.protocol !== `${STAGE_PROTOCOL}:` || callbackUrl.hostname !== DESKTOP_AUTH_PATH) {
      return { error: "Unsupported desktop auth callback URL.", ok: false };
    }

    const code = callbackUrl.searchParams.get("code");
    const state = callbackUrl.searchParams.get("state");

    logDesktopInfo("stage-auth", "received desktop auth callback");

    if (!code) {
      return { error: "Desktop auth callback is missing a code.", ok: false };
    }

    const stateError = await this.validateState(state);

    if (stateError) {
      return { error: stateError, ok: false };
    }

    const session = await this.exchangeCodeForSession(code);
    this.pendingAuthAttempt = null;
    await this.clearPendingAuthAttempt();
    this.storedSession = desktopStoredSessionSchema.parse(session);
    await saveStoredSession(this.storedSession);
    const publicSession = toPublicSession(this.storedSession);
    createMainWindow();
    BrowserWindow.getAllWindows().forEach((window) => {
      window.webContents.send(IPC_CHANNELS.authSessionChanged, publicSession);
    });
    logDesktopInfo("stage-auth", "desktop auth callback accepted");

    return { ok: true, session: publicSession };
  }

  private async validateState(state: string | null) {
    if (!state) {
      return "Desktop auth callback is missing state.";
    }

    const pendingAuthAttempt =
      this.pendingAuthAttempt ?? await this.loadPendingAuthAttempt();

    if (!pendingAuthAttempt) {
      return "No pending desktop auth attempt exists.";
    }

    this.pendingAuthAttempt = pendingAuthAttempt;

    if (pendingAuthAttempt.state !== state) {
      return "Desktop auth state mismatch.";
    }

    if (now() - pendingAuthAttempt.createdAt > AUTH_STATE_TTL_MS) {
      this.pendingAuthAttempt = null;
      await this.clearPendingAuthAttempt();
      return "Desktop auth state expired.";
    }

    return null;
  }

  private async exchangeCodeForSession(code: string): Promise<DesktopStoredSession> {
    if (code.startsWith("stg_")) {
      throw new Error("Developer API keys cannot be used for desktop login.");
    }

    logDesktopInfo("stage-auth", "verifying Convex Auth desktop token");
    const response = await fetch(`${getDesktopApiBaseUrl()}/me`, {
      headers: {
        Authorization: `Bearer ${code}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Desktop auth token verification failed with ${response.status}.`);
    }

    const identity = desktopAuthIdentitySchema.parse(await response.json());
    logDesktopInfo(
      "stage-auth",
      `verified desktop user ${identity.user.name ?? identity.user.email ?? identity.user.id}`,
    );
    return desktopStoredSessionSchema.parse({
      accessToken: code,
      avatarUrl: identity.user.avatarUrl,
      email: identity.user.email,
      name: identity.user.name,
      userId: identity.user.id,
    });
  }

  private async getStoredSession() {
    if (this.storedSession) {
      return this.storedSession;
    }

    const loadedSession = await loadStoredSession();
    this.storedSession = loadedSession;
    return loadedSession;
  }

  private async savePendingAuthAttempt(attempt: PendingAuthAttempt) {
    const filePath = authStatePath();
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, JSON.stringify(attempt), "utf8");
  }

  private async loadPendingAuthAttempt() {
    try {
      const raw = await readFile(authStatePath(), "utf8");
      const parsed = JSON.parse(raw) as Partial<PendingAuthAttempt>;

      if (typeof parsed.state !== "string" || typeof parsed.createdAt !== "number") {
        return null;
      }

      return {
        createdAt: parsed.createdAt,
        state: parsed.state,
      };
    } catch {
      return null;
    }
  }

  private async clearPendingAuthAttempt() {
    try {
      await rm(authStatePath(), { force: true });
    } catch {
      // Best effort cleanup for non-sensitive nonce state.
    }
  }
}

export function createDesktopAuthController() {
  return new DesktopAuthController();
}
