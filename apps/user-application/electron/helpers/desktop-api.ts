import { app } from "electron";
import {
  DesktopSessionExpiredError,
  clearSessionAndNotify,
  isAuthFailureStatus,
} from "../desktop-api/auth-failure";
import type { DesktopAuthController } from "../auth";

export const PRODUCTION_DESKTOP_API_URL = "https://getstage.co/api/v1";
export const TESTING_DESKTOP_API_URL = "https://testing.getstage.co/api/v1";

function inferDesktopApiBaseUrlFromAuthUrl(authUrl: string) {
  try {
    const { hostname } = new URL(authUrl);
    if (hostname === "testing.getstage.co") {
      return TESTING_DESKTOP_API_URL;
    }
    if (hostname === "getstage.co" || hostname === "www.getstage.co") {
      return PRODUCTION_DESKTOP_API_URL;
    }
  } catch {
    // Fall through to packaged/dev defaults.
  }

  return null;
}

export function getDesktopApiBaseUrl() {
  if (process.env.STAGE_DESKTOP_API_URL?.trim()) {
    return process.env.STAGE_DESKTOP_API_URL.replace(/\/+$/, "");
  }

  const authUrl = process.env.STAGE_DESKTOP_AUTH_URL?.trim();
  if (authUrl) {
    const inferred = inferDesktopApiBaseUrlFromAuthUrl(authUrl);
    if (inferred) {
      return inferred;
    }
  }

  return app.isPackaged ? PRODUCTION_DESKTOP_API_URL : TESTING_DESKTOP_API_URL;
}

type DesktopApiRequestArgs = {
  authController: DesktopAuthController;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  body?: unknown;
};

/**
 * Authenticated request against the Stage `/api/v1` namespace.
 *
 * Centralises three concerns so individual resource fetchers stay tiny:
 *   1. Reading the cached desktop access token from the auth controller.
 *      Throws if no session is connected.
 *   2. Detecting auth-failure responses (401 / 403). On detection it clears
 *      the stored session, broadcasts `auth:session-changed: null` to all
 *      renderer windows, and throws `DesktopSessionExpiredError` so the
 *      renderer drops cleanly into the "Sign in" empty state instead of
 *      spamming further requests with a dead token.
 *   3. Mapping any other non-2xx response to a generic Error.
 *
 * Caller responsibility: parse the returned JSON with the matching Zod
 * contract before handing it to renderer code.
 */
export async function sendDesktopApi<T>(args: DesktopApiRequestArgs): Promise<T> {
  const accessToken = await args.authController.getAccessToken();
  if (!accessToken) {
    throw new Error("Stage desktop session is not connected.");
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
  };
  let bodyPayload: BodyInit | undefined;
  if (args.body !== undefined) {
    headers["Content-Type"] = "application/json";
    bodyPayload = JSON.stringify(args.body);
  }

  const response = await fetch(`${getDesktopApiBaseUrl()}${args.path}`, {
    method: args.method,
    headers,
    body: bodyPayload,
  });

  if (isAuthFailureStatus(response.status)) {
    await clearSessionAndNotify(args.authController);
    throw new DesktopSessionExpiredError();
  }

  if (!response.ok) {
    throw new Error(`Stage API request failed with ${response.status}.`);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

export function fetchDesktopApiJson<T>(args: {
  authController: DesktopAuthController;
  path: string;
}) {
  return sendDesktopApi<T>({ ...args, method: "GET" });
}

export function postDesktopApiJson<T>(args: {
  authController: DesktopAuthController;
  path: string;
  body: unknown;
}) {
  return sendDesktopApi<T>({ ...args, method: "POST" });
}
