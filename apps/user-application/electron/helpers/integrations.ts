import { app } from "electron";
import {
  DEV_DESKTOP_AUTH_CALLBACK_HOST,
  DEV_DESKTOP_AUTH_CALLBACK_PORT,
  STAGE_PROTOCOL,
} from "./auth";

export const DESKTOP_INTEGRATIONS_HOST = "integrations";
export const DEV_DESKTOP_INTEGRATIONS_BASE = `http://${DEV_DESKTOP_AUTH_CALLBACK_HOST}:${DEV_DESKTOP_AUTH_CALLBACK_PORT}/integrations`;

export type NativeIntegrationProvider = "figma" | "notion";

export function getDesktopIntegrationReturnUrl(provider: NativeIntegrationProvider) {
  if (!app.isPackaged) {
    return `${DEV_DESKTOP_INTEGRATIONS_BASE}/${provider}`;
  }

  return `${STAGE_PROTOCOL}://${DESKTOP_INTEGRATIONS_HOST}/${provider}`;
}

function getProviderFromIntegrationUrl(url: URL): NativeIntegrationProvider | null {
  if (url.protocol === `${STAGE_PROTOCOL}:` && url.hostname === DESKTOP_INTEGRATIONS_HOST) {
    if (url.pathname === "/figma") {
      return "figma";
    }
    if (url.pathname === "/notion") {
      return "notion";
    }
    return null;
  }

  if (
    url.protocol === "http:" &&
    url.hostname === DEV_DESKTOP_AUTH_CALLBACK_HOST &&
    url.port === String(DEV_DESKTOP_AUTH_CALLBACK_PORT)
  ) {
    if (url.pathname === "/integrations/figma") {
      return "figma";
    }
    if (url.pathname === "/integrations/notion") {
      return "notion";
    }
  }

  return null;
}

export function isStageIntegrationUrl(value: string) {
  try {
    const url = new URL(value);
    return getProviderFromIntegrationUrl(url) !== null;
  } catch {
    return false;
  }
}

export function findStageIntegrationUrl(argv: string[]) {
  return argv.find(isStageIntegrationUrl) ?? null;
}

export function parseIntegrationOAuthCallback(value: string) {
  const url = new URL(value);
  const provider = getProviderFromIntegrationUrl(url);

  if (!provider) {
    return { error: "Unsupported integration callback URL.", ok: false as const };
  }

  const status = url.searchParams.get("integration_status");

  if (status !== "connected" && status !== "error") {
    return { error: "Integration callback is missing a valid status.", ok: false as const };
  }

  return {
    ok: true as const,
    provider,
    reason: url.searchParams.get("reason") ?? undefined,
    status: status as "connected" | "error",
  };
}
