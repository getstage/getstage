import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { shell } from "electron";
import {
  desktopStoredSessionSchema,
  type DesktopSession,
  type DesktopStoredSession,
} from "@shared/models/desktop";
import {
  AUTH_STATE_TTL_MS,
  DEV_USER_ID,
  DESKTOP_AUTH_PATH,
  STAGE_PROTOCOL,
  authStatePath,
  getDesktopAuthExchangeUrl,
  getDesktopAuthRedirectUri,
  getDesktopAuthUrl,
  isStageAuthUrl,
  toPublicSession,
  type AuthCallbackResult,
  type PendingAuthAttempt,
} from "./helpers/auth";
import {
  clearStoredSession,
  loadStoredSession,
  saveStoredSession,
} from "./helpers/session-storage";
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
    createMainWindow();
    console.info("[stage-auth] desktop auth callback accepted");

    return { ok: true, session: toPublicSession(this.storedSession) };
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
      return {
        accessToken: code,
        userId: DEV_USER_ID,
      };
    }

    const response = await fetch(getDesktopAuthExchangeUrl(), {
      body: JSON.stringify({ code }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    if (!response.ok) {
      throw new Error(`Desktop auth exchange failed with ${response.status}.`);
    }

    const body = await response.json() as { session?: unknown };
    return desktopStoredSessionSchema.parse(body.session);
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
