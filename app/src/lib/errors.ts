const STACK_TRACE_PATTERN =
  /(^|\n)\s*at\s+[^\n]+|node_modules|registration_impl|invokeHttpAction|invokeFunction|getProviderOrThrow/i;

const INTERNAL_ERROR_PATTERN =
  /Uncaught Error:|Request ID:|Provider `.+` is not configured|Missing environment variable|JWT_PRIVATE_KEY|JWKS|CONVEX_SITE_URL|SITE_URL|Stripe checkout URL is missing|Stripe portal URL is missing|Stripe Connect URL is missing/i;

const AUTH_INVALID_CODE_PATTERN =
  /invalid code|code must be 6 digits|expired code|verification code|incorrect code/i;

const AUTH_INVALID_EMAIL_PATTERN = /valid email|email address/i;
const AUTH_UNAVAILABLE_PATTERN = /auth|oauth|loops-otp|google|sign in|signin/i;
const PERMISSION_PATTERN = /unauthenticated|not authenticated|not authorized|forbidden|access denied/i;
const NETWORK_PATTERN = /failed to fetch|network ?error|load failed|network request failed/i;

function extractErrorMessage(error: unknown): string | null {
  if (typeof error === "string") {
    return error.trim();
  }

  if (error instanceof Error) {
    return error.message.trim();
  }

  return null;
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
    return "That code is invalid or has expired. Please request a new one.";
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
