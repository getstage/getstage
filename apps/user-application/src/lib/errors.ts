const STACK_TRACE_PATTERN =
  /(^|\n)\s*at\s+[^\n]+|node_modules|registration_impl|invokeHttpAction|invokeFunction|getProviderOrThrow/i;

const INTERNAL_ERROR_PATTERN =
  /Uncaught Error:|Request ID:|Provider `.+` is not configured|Missing environment variable|JWT_PRIVATE_KEY|JWKS|CONVEX_SITE_URL|SITE_URL|Stripe checkout URL is missing|Stripe portal URL is missing|Stripe Connect URL is missing/i;

const AUTH_INVALID_CODE_PATTERN =
  /invalid code|invalid verification code|code must be 6 digits|expired code|verification code|incorrect code|could not verify code/i;

const AUTH_INVALID_EMAIL_PATTERN = /valid email|email address/i;
const AUTH_UNAVAILABLE_PATTERN = /auth|oauth|loops-otp|google|sign in|signin/i;
const PERMISSION_PATTERN = /unauthenticated|not authenticated|not authorized|forbidden|access denied/i;
const NETWORK_PATTERN = /failed to fetch|network ?error|load failed|network request failed/i;
const PROJECT_UPGRADE_REQUIRED_PATTERN = /upgrade to pro to create (projects|more projects|another project)/i;

function extractErrorMessage(error: unknown): string | null {
  if (typeof error === "string") {
    return error.trim();
  }

  if (error instanceof Error) {
    const details = [error.message, ...extractNestedMessages(error)].filter(Boolean);
    return details.map((value) => value.trim()).join("\n").trim();
  }

  if (error && typeof error === "object") {
    const details = extractNestedMessages(error);
    if (details.length > 0) {
      return details.map((value) => value.trim()).join("\n").trim();
    }
  }

  return null;
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
    INTERNAL_ERROR_PATTERN.test(message)
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

  if (PERMISSION_PATTERN.test(message)) {
    return "Please sign in again and try once more.";
  }

  if (NETWORK_PATTERN.test(message)) {
    return "We could not reach the server. Please check your connection and try again.";
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
