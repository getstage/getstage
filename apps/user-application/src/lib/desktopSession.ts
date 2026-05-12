import type { DesktopSession } from "@shared/models/desktop";

/** Single query key for `desktop.auth.getSession()` — keep in sync everywhere. */
export const desktopSessionQueryKey = ["desktop", "auth", "session"] as const;

/**
 * Read the current desktop session outside React (e.g. TanStack Router `beforeLoad`).
 * Returns `null` if `stageDesktop` is missing or IPC fails.
 */
export async function getDesktopSession(): Promise<DesktopSession | null> {
  if (typeof window === "undefined" || !window.stageDesktop) {
    return null;
  }

  try {
    return await window.stageDesktop.auth.getSession();
  } catch {
    return null;
  }
}
