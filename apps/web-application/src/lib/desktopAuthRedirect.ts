const DESKTOP_AUTH_REDIRECT_KEY = "stage.desktopAuth.redirect";
const DESKTOP_AUTH_REDIRECT_TTL_MS = 10 * 60 * 1000;
const LOCAL_DESKTOP_AUTH_CALLBACK_URL = "http://127.0.0.1:48224/auth";
const LOCAL_DESKTOP_AUTH_LOGIN_URL = "http://127.0.0.1:48224/login";

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
      isValidDesktopCallbackUrl(redirectUri)
    );
  } catch {
    return false;
  }
}

export function isValidDesktopCallbackUrl(value: string | null | undefined) {
  if (!value) {
    return false;
  }

  try {
    const url = new URL(value);
    return (
      (url.protocol === "stage:" && url.hostname === "auth") ||
      (
        url.protocol === "http:" &&
        url.hostname === "127.0.0.1" &&
        url.port === "48224" &&
        url.pathname === "/auth"
      )
    );
  } catch {
    return false;
  }
}

export function isLocalDesktopCallbackUrl(value: URL) {
  return (
    value.protocol === "http:" &&
    value.hostname === "127.0.0.1" &&
    value.port === "48224" &&
    value.pathname === "/auth"
  );
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

export function getLocalDesktopAuthCallbackUrl() {
  return LOCAL_DESKTOP_AUTH_CALLBACK_URL;
}

export function getLocalDesktopAuthLoginUrl() {
  return LOCAL_DESKTOP_AUTH_LOGIN_URL;
}

/** Absolute URL on the current web origin for the desktop JWT handoff page. */
export function buildDesktopAuthHandoffUrl(args: {
  redirectUri: string;
  state: string;
  origin?: string;
}) {
  if (!isValidDesktopCallbackUrl(args.redirectUri)) {
    return null;
  }

  const origin =
    args.origin ?? (typeof window !== "undefined" ? window.location.origin : undefined);

  if (!origin) {
    return null;
  }

  const search = new URLSearchParams({
    redirect_uri: args.redirectUri,
    state: args.state,
  });

  return `${origin}/auth/desktop?${search.toString()}`;
}
