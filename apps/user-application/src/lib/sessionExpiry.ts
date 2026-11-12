import { isSessionExpiredError } from "@stage/project-ui/errors";

// Signs Stage for Mac out when Convex says the session expired.
export async function clearDesktopSessionIfExpired(error: unknown): Promise<boolean> {
  if (!isSessionExpiredError(error)) {
    return false;
  }

  try {
    await window.stageDesktop?.auth?.logout?.();
  } catch {
    // Ignore sign-out failures; the auth route still handles the empty session.
  }

  return true;
}
