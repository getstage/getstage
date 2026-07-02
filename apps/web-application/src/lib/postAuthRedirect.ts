import {
  buildDesktopAuthHandoffUrl,
  getPendingDesktopAuthRedirect,
  isDesktopAuthRedirect,
  storePendingDesktopAuthRedirect,
} from "@/lib/desktopAuthRedirect";

export const DEFAULT_POST_AUTH_PATH = "/download/mac";

const ALLOWED_POST_AUTH_PATHS = new Set([DEFAULT_POST_AUTH_PATH, "/auth/desktop"]);

function toAbsoluteRedirectTarget(value: string) {
  if (typeof window === "undefined") {
    return value;
  }

  try {
    if (isDesktopAuthRedirect(value)) {
      return new URL(value, window.location.origin).href;
    }
  } catch {
    return value;
  }

  return value;
}

function normalizeRedirectPath(value: string | undefined) {
  if (!value) {
    return null;
  }

  if (value.startsWith("/") && ALLOWED_POST_AUTH_PATHS.has(value.split("?")[0] ?? value)) {
    return value;
  }

  if (isDesktopAuthRedirect(value)) {
    return toAbsoluteRedirectTarget(value);
  }

  return null;
}

export function resolvePostAuthRedirect(args: {
  desktopRedirectUri?: string;
  desktopState?: string;
  redirect?: string;
  pendingDesktopRedirect?: string | null;
}) {
  const desktopAuthRedirect =
    args.desktopRedirectUri && args.desktopState
      ? buildDesktopAuthHandoffUrl({
          redirectUri: args.desktopRedirectUri,
          state: args.desktopState,
        })
      : null;

  const redirectTarget =
    desktopAuthRedirect ??
    normalizeRedirectPath(args.redirect) ??
    args.pendingDesktopRedirect ??
    DEFAULT_POST_AUTH_PATH;

  return toAbsoluteRedirectTarget(redirectTarget);
}

export function rememberDesktopRedirect(redirectTo: string) {
  if (isDesktopAuthRedirect(redirectTo)) {
    storePendingDesktopAuthRedirect(redirectTo);
  }
}

export function getStoredDesktopRedirect() {
  return getPendingDesktopAuthRedirect();
}
