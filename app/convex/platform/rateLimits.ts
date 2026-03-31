import { MINUTE, RateLimiter } from "@convex-dev/rate-limiter";
import { components } from "../_generated/api";
import { normalizeEmailAddress } from "../userEmails";

const OTP_EMAIL_WINDOW_MS = 15 * MINUTE;
const HOUR = 60 * MINUTE;
const PROJECT_INVITE_RECIPIENT_WINDOW_MS = 10 * MINUTE;
const API_REQUEST_WINDOW_MS = MINUTE;

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
  projectInvitesByOwner: {
    kind: "fixed window",
    rate: 20,
    period: HOUR,
  },
  projectInvitesByProjectRecipient: {
    kind: "fixed window",
    rate: 1,
    period: PROJECT_INVITE_RECIPIENT_WINDOW_MS,
  },
  projectInvitesGlobal: {
    kind: "fixed window",
    rate: 60,
    period: MINUTE,
    shards: 10,
  },
  apiRequestsByKey: {
    kind: "fixed window",
    rate: 120,
    period: API_REQUEST_WINDOW_MS,
  },
  apiRequestsGlobal: {
    kind: "fixed window",
    rate: 1000,
    period: API_REQUEST_WINDOW_MS,
    shards: 10,
  },
});

export function normalizeRateLimitEmail(email: string) {
  return normalizeEmailAddress(email);
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

export async function enforceProjectInviteRateLimit(
  ctx: Parameters<typeof rateLimiter.limit>[0],
  args: {
    ownerId: string;
    projectId: string;
    email: string;
  },
) {
  const globalStatus = await rateLimiter.limit(ctx, "projectInvitesGlobal");
  if (!globalStatus.ok) {
    throw new Error(
      `Too many project invites are being sent right now. Please wait ${formatRetryAfter(globalStatus.retryAfter)} and try again.`,
    );
  }

  const ownerStatus = await rateLimiter.limit(ctx, "projectInvitesByOwner", {
    key: args.ownerId,
  });
  if (!ownerStatus.ok) {
    throw new Error(
      `You've sent too many project invites recently. Please wait ${formatRetryAfter(ownerStatus.retryAfter)} and try again.`,
    );
  }

  const recipientStatus = await rateLimiter.limit(ctx, "projectInvitesByProjectRecipient", {
    key: `${args.projectId}:${normalizeRateLimitEmail(args.email)}`,
  });
  if (!recipientStatus.ok) {
    throw new Error(
      `An invite was already sent to this email recently. Please wait ${formatRetryAfter(recipientStatus.retryAfter)} before sending another.`,
    );
  }
}

export async function enforceApiRequestRateLimit(
  ctx: Parameters<typeof rateLimiter.limit>[0],
  apiKeyId: string,
) {
  const globalStatus = await rateLimiter.limit(ctx, "apiRequestsGlobal");
  if (!globalStatus.ok) {
    throw new Error(
      `Too many API requests are being made right now. Please wait ${formatRetryAfter(globalStatus.retryAfter)} and try again.`,
    );
  }

  const keyStatus = await rateLimiter.limit(ctx, "apiRequestsByKey", {
    key: apiKeyId,
  });
  if (!keyStatus.ok) {
    throw new Error(
      `This API key has hit its rate limit. Please wait ${formatRetryAfter(keyStatus.retryAfter)} and try again.`,
    );
  }
}
