import { MINUTE, RateLimiter } from "@convex-dev/rate-limiter";
import { components } from "./_generated/api";

const OTP_EMAIL_WINDOW_MS = 15 * MINUTE;

export const rateLimiter = new RateLimiter(components.rateLimiter, {
  otpRequestsByEmail: {
    kind: "fixed window",
    rate: 6,
    period: OTP_EMAIL_WINDOW_MS,
  },
  otpRequestsGlobal: {
    kind: "fixed window",
    rate: 30,
    period: MINUTE,
    shards: 10,
  },
});

export function normalizeRateLimitEmail(email: string) {
  return email.trim().toLowerCase();
}

function formatRetryAfter(retryAfter?: number) {
  const ms = retryAfter ?? MINUTE;
  const totalSeconds = Math.max(1, Math.ceil(ms / 1000));

  if (totalSeconds >= 60) {
    const minutes = Math.ceil(totalSeconds / 60);
    return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  }

  return `${totalSeconds} second${totalSeconds === 1 ? "" : "s"}`;
}

export async function enforceOtpRequestRateLimit(
  ctx: Parameters<typeof rateLimiter.limit>[0],
  email: string,
) {
  const globalStatus = await rateLimiter.limit(ctx, "otpRequestsGlobal");
  if (!globalStatus.ok) {
    throw new Error(
      `Too many sign-in codes are being requested right now. Please wait ${formatRetryAfter(globalStatus.retryAfter)} and try again.`,
    );
  }

  const emailStatus = await rateLimiter.limit(ctx, "otpRequestsByEmail", {
    key: normalizeRateLimitEmail(email),
  });
  if (!emailStatus.ok) {
    throw new Error(
      `Too many sign-in codes were requested for this email address. Please wait ${formatRetryAfter(emailStatus.retryAfter)} and try again.`,
    );
  }
}
