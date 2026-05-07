const DESKTOP_AUTH_REDIRECT_KEY = "stage.desktopAuth.redirect";
const DESKTOP_AUTH_REDIRECT_TTL_MS = 10 * 60 * 1000;
export const WEB_DESKTOP_AUTH_STATE = "web-session";
export const WEB_DESKTOP_AUTH_SOURCE = "web-settings";

type StoredDesktopAuthRedirect = {
  createdAt: number;
  value: string;
};

function canUseStorage() {
  return (
    typeof window !== "undefined" &&
    typeof window.localStorage !== "undefined" &&
    typeof window.sessionStorage !== "undefined"
  );
}

export function isDesktopAuthRedirect(value: string | null | undefined) {
  if (!value || typeof window === "undefined") {
    return false;
  }

  try {
    const url = new URL(value, window.location.origin);
    const redirectUri = url.searchParams.get("redirect_uri");

    return (
      url.origin === window.location.origin &&
      url.pathname === "/auth/desktop" &&
      Boolean(url.searchParams.get("state")) &&
      redirectUri === "stage://auth"
    );
  } catch {
    return false;
  }
}

export function storePendingDesktopAuthRedirect(value: string) {
  if (!canUseStorage() || !isDesktopAuthRedirect(value)) {
    return;
  }

  const payload: StoredDesktopAuthRedirect = {
    createdAt: Date.now(),
    value,
  };
  const serialized = JSON.stringify(payload);

  window.localStorage.setItem(DESKTOP_AUTH_REDIRECT_KEY, serialized);
  window.sessionStorage.setItem(DESKTOP_AUTH_REDIRECT_KEY, serialized);
}

export function getPendingDesktopAuthRedirect() {
  if (!canUseStorage()) {
    return null;
  }

  const raw =
    window.localStorage.getItem(DESKTOP_AUTH_REDIRECT_KEY) ??
    window.sessionStorage.getItem(DESKTOP_AUTH_REDIRECT_KEY);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<StoredDesktopAuthRedirect>;

    if (
      typeof parsed.createdAt !== "number" ||
      typeof parsed.value !== "string" ||
      Date.now() - parsed.createdAt > DESKTOP_AUTH_REDIRECT_TTL_MS ||
      !isDesktopAuthRedirect(parsed.value)
    ) {
      clearPendingDesktopAuthRedirect();
      return null;
    }

    return parsed.value;
  } catch {
    clearPendingDesktopAuthRedirect();
    return null;
  }
}

export function clearPendingDesktopAuthRedirect() {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(DESKTOP_AUTH_REDIRECT_KEY);
  window.sessionStorage.removeItem(DESKTOP_AUTH_REDIRECT_KEY);
}

export function buildWebDesktopAuthCallbackUrl(key: string) {
  const callbackUrl = new URL("stage://auth");
  callbackUrl.searchParams.set("code", key);
  callbackUrl.searchParams.set("state", WEB_DESKTOP_AUTH_STATE);
  callbackUrl.searchParams.set("source", WEB_DESKTOP_AUTH_SOURCE);
  return callbackUrl.toString();
}
