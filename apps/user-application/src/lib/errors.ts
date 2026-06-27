const STACK_TRACE_PATTERN =
  /(^|\n)\s*at\s+[^\n]+|node_modules|registration_impl|invokeHttpAction|invokeFunction|getProviderOrThrow/i;

const INTERNAL_ERROR_PATTERN =
  /Uncaught Error:|Request ID:|Provider `.+` is not configured|Missing environment variable|JWT_PRIVATE_KEY|JWKS|CONVEX_SITE_URL|SITE_URL|Stripe checkout URL is missing|Stripe portal URL is missing|Stripe Connect URL is missing/i;

const RUNTIME_ERROR_PATTERN =
  /Cannot read properties of (null|undefined)|Cannot destructure property|undefined is not an object|null is not an object|is not a function|Cannot access .+ before initialization|Maximum update depth exceeded|Minified React error/i;

const AUTH_INVALID_CODE_PATTERN =
  /invalid code|invalid verification code|code must be 6 digits|expired code|verification code|incorrect code|could not verify code/i;

const AUTH_INVALID_EMAIL_PATTERN = /valid email|email address/i;
const AUTH_UNAVAILABLE_PATTERN = /auth|oauth|loops-otp|google|sign in|signin/i;
export const SESSION_EXPIRED_USER_MESSAGE =
  "Your session expired. Please log in again.";

const SESSION_EXPIRED_PATTERN =
  /DesktopSessionExpiredError|session expired|please sign in again|please log in again|log in again|stage desktop session is not connected|not authenticated|unauthenticated|authentication required|invalid (auth|jwt|token)|token expired|failed with 401|failed with 403|access denied|forbidden/i;
const NETWORK_PATTERN =
  /failed to fetch|fetch failed|network ?error|load failed|network request failed|econnrefused|enotfound|etimedout|socket hang up/i;
const ENGINE_REMOTE_PATTERN =
  /Error invoking remote method 'engine:[^']+'|Stage Engine request failed|stage engine/i;
const SCREEN_CAPTURE_PERMISSION_PATTERN =
  /screen:list-window-sources|screen:capture|failed to get sources/i;
const ENGINE_START_PATTERN = /engine:start-run/i;
const MODULE_LOAD_PATTERN =
  /does not provide an export|failed to fetch dynamically imported module|cannot find module|module not found|importing a module script failed|error loading dynamically imported module|\/@fs\//i;
const PROJECT_UPGRADE_REQUIRED_PATTERN =
  /free plan includes up to \d+ projects|upgrade to pro to create (another project|more projects?|projects)|project limit/i;

const RESEARCH_SAVE_FAILURE_PATTERN =
  /Update on nonexistent document|Server Error|ConvexError|Could not find public function|called by client/i;

const RESEARCH_ALREADY_RUNNING_PATTERN =
  /research run is already in progress|already in progress for this project/i;

const RESEARCH_INCOMPLETE_ARTIFACT_PATTERN =
  /Research artifact is incomplete|missing required section|competitiveAnalysis\.|companySnapshot|opportunities|targetUsers/i;

function extractErrorMessage(error: unknown): string | null {
  if (typeof error === "string") {
    return error.trim();
  }

  if (error instanceof Error) {
    return normalizeMessages([error.message, ...extractNestedMessages(error)]);
  }

  if (error && typeof error === "object") {
    const details = extractNestedMessages(error);
    if (details.length > 0) {
      return normalizeMessages(details);
    }
  }

  return null;
}

function normalizeMessages(messages: string[]): string {
  return Array.from(new Set(messages.map((value) => value.trim()).filter(Boolean)))
    .join("\n")
    .trim();
}

function extractNestedMessages(value: unknown, seen = new Set<unknown>()): string[] {
  if (value === null || value === undefined || seen.has(value)) {
    return [];
  }

  if (typeof value === "string") {
    return [value];
  }

  if (typeof value !== "object") {
    return [];
  }

  seen.add(value);

  const details: string[] = [];
  const record = value as Record<string, unknown>;

  for (const key of ["message", "statusText", "error", "data"]) {
    const nested = record[key];
    if (typeof nested === "string" && nested.trim()) {
      details.push(nested);
    }
  }

  if ("cause" in record) {
    details.push(...extractNestedMessages(record.cause, seen));
  }

  return details;
}

function isUnsafeUserMessage(message: string): boolean {
  return (
    message.length > 180 ||
    STACK_TRACE_PATTERN.test(message) ||
    INTERNAL_ERROR_PATTERN.test(message) ||
    RUNTIME_ERROR_PATTERN.test(message)
  );
}

export function toUserFacingErrorMessage(error: unknown, fallback: string): string {
  const message = extractErrorMessage(error);
  if (!message) {
    return fallback;
  }

  if (AUTH_INVALID_CODE_PATTERN.test(message)) {
    return "That code didn't work. Enter the latest 6-digit code from your email and try again.";
  }

  if (AUTH_INVALID_EMAIL_PATTERN.test(message)) {
    return "Please enter a valid email address.";
  }

  if (isSessionExpiredErrorMessage(message)) {
    return SESSION_EXPIRED_USER_MESSAGE;
  }

  if (SCREEN_CAPTURE_PERMISSION_PATTERN.test(message)) {
    return "Stage needs Screen Recording permission to capture. Turn it on in System Settings → Privacy & Security → Screen Recording, then reopen Stage.";
  }

  if (ENGINE_START_PATTERN.test(message) && NETWORK_PATTERN.test(message)) {
    return "Stage Engine is not reachable. Restart Stage and try again.";
  }

  if (ENGINE_REMOTE_PATTERN.test(message) && NETWORK_PATTERN.test(message)) {
    return "Stage could not reach the local engine. Restart Stage and try again.";
  }

  if (ENGINE_REMOTE_PATTERN.test(message)) {
    return fallback;
  }

  if (NETWORK_PATTERN.test(message)) {
    return "We could not reach the server. Please check your connection and try again.";
  }

  if (MODULE_LOAD_PATTERN.test(message)) {
    return fallback;
  }

  if (PROJECT_UPGRADE_REQUIRED_PATTERN.test(message)) {
    return "You've reached the 1-project limit on the Free plan. Upgrade to Pro to create another project.";
  }

  if (RESEARCH_ALREADY_RUNNING_PATTERN.test(message)) {
    return "A previous Research run was still finishing in the background. Wait a few seconds, then try again.";
  }

  if (RESEARCH_SAVE_FAILURE_PATTERN.test(message) || RESEARCH_INCOMPLETE_ARTIFACT_PATTERN.test(message)) {
    return fallback;
  }

  if (isUnsafeUserMessage(message)) {
    if (AUTH_UNAVAILABLE_PATTERN.test(message)) {
      return "Sign-in is temporarily unavailable. Please try again in a moment.";
    }

    return fallback;
  }

  return message;
}

export function isProjectUpgradeRequiredError(error: unknown): boolean {
  const message = extractErrorMessage(error);
  return message ? PROJECT_UPGRADE_REQUIRED_PATTERN.test(message) : false;
}

function isSessionExpiredErrorMessage(message: string) {
  return SESSION_EXPIRED_PATTERN.test(message);
}

export function isSessionExpiredError(error: unknown): boolean {
  if (error instanceof Error && error.name === "DesktopSessionExpiredError") {
    return true;
  }

  const message = extractErrorMessage(error);
  return message ? isSessionExpiredErrorMessage(message) : false;
}

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
