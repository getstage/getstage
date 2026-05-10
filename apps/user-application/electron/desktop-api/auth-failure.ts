import type { DesktopAuthController } from "../auth";

/**
 * HTTP statuses we treat as "this token is no longer valid".
 *
 * 401 is the canonical "expired/invalid auth" response.
 * 403 is included because some Convex/HTTP layers return it for revoked sessions.
 *
 * 400 is intentionally NOT in this list — it would also catch malformed
 * request bodies and trigger spurious sign-outs. If we ever need 400 to
 * count as auth-failure for a transitional period, do it explicitly at the
 * call site, not here.
 */
const AUTH_FAILURE_STATUSES = new Set<number>([401, 403]);

export function isAuthFailureStatus(status: number) {
  return AUTH_FAILURE_STATUSES.has(status);
}

/**
 * Error thrown when the desktop session is no longer accepted by the API.
 * Distinguishable from generic fetch errors so callers can render a "Sign in"
 * UX instead of a generic failure message.
 */
export class DesktopSessionExpiredError extends Error {
  constructor(message = "Stage desktop session expired. Please sign in again.") {
    super(message);
    this.name = "DesktopSessionExpiredError";
  }
}

/**
 * Clear the stored desktop session and notify all renderer windows so the UI
 * drops to the "Sign in" empty state. Delegates to `authController.signOut()`
 * so the manual Log out button and the automatic 401 clear share one
 * codepath. Safe to call multiple times.
 */
export async function clearSessionAndNotify(authController: DesktopAuthController) {
  await authController.signOut();
}
