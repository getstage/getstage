import type { DesktopSession } from "@shared/models/desktop";

/** Single query key for desktop session — keep in sync everywhere. */
export const desktopSessionQueryKey = ["desktop", "auth", "session"] as const;

const SESSION_CACHE_TTL_MS = 1000 * 60 * 5;

let sessionCache: { data: DesktopSession | null; timestamp: number } | null = null;

/**
 * Read the current desktop session outside React (e.g. TanStack Router `beforeLoad`).
 * Returns `null` if `stageDesktop` is missing or IPC fails.
 */
export async function getDesktopSessionCached(): Promise<DesktopSession | null> {
  if (sessionCache && Date.now() - sessionCache.timestamp < SESSION_CACHE_TTL_MS) {
    return sessionCache.data;
  }

  if (typeof window === "undefined" || !window.stageDesktop) {
    sessionCache = { data: null, timestamp: Date.now() };
    return null;
  }

  try {
    const data = await window.stageDesktop.auth.getSession();
    sessionCache = { data, timestamp: Date.now() };
    return data;
  } catch {
    sessionCache = { data: null, timestamp: Date.now() };
    return null;
  }
}

export function clearDesktopSessionCache() {
  sessionCache = null;
}
