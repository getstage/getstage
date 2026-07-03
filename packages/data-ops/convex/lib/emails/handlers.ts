import { v } from "convex/values";
import type { Id } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { requireAuthUser } from "../../_helpers";
import { now } from "../../helpers/time";
import type { StageEmailTemplate } from "stage-emails";
import type { EmailEvent, EmailId } from "@convex-dev/resend";
import { FLOW_STEPS, type EmailEventType, type EmailFlow } from "./config";

const DAY = 24 * 60 * 60 * 1000;

export const emailEventTypeV = v.union(
  v.literal("signed_up"),
  v.literal("app_downloaded"),
  v.literal("trial_started"),
  v.literal("payment_confirmed"),
);

export const emailStatusV = v.union(
  v.literal("sent"),
  v.literal("skipped"),
  v.literal("cancelled"),
  v.literal("failed"),
);

// ---------------------------------------------------------------------------
// recordEmailEvent — the single entry point for the 4 events.
// Idempotent: one row per (user, event). Retries / double-clicks / Strict-Mode
// re-runs all no-op because the emailEvents row already exists.
// ---------------------------------------------------------------------------

export const recordEmailEventArgs = {
  userId: v.id("users"),
  type: emailEventTypeV,
  metadata: v.optional(v.string()),
};

export async function recordEmailEventHandler(
  ctx: MutationCtx,
  args: { userId: Id<"users">; type: EmailEventType; metadata?: string },
) {
  const existing = await ctx.db
    .query("emailEvents")
    .withIndex("by_user_type", (q) => q.eq("userId", args.userId).eq("type", args.type))
    .first();
  if (existing) return;

  await ctx.db.insert("emailEvents", {
    userId: args.userId,
    type: args.type,
    metadata: args.metadata,
    createdAt: now(),
  });

  // Event effects — cancel pending steps before scheduling new ones.
  if (args.type === "app_downloaded") {
    await cancelPendingStepsByTemplate(ctx, args.userId, "download_reminder");
  }
  if (args.type === "payment_confirmed") {
    await cancelPendingStepsByFlow(ctx, args.userId, "trial");
  }

  // Make sure every user we email has a working unsubscribe token.
  await ensureUnsubscribeToken(ctx, args.userId);

  for (const step of FLOW_STEPS[args.type]) {
    const emailId = await ctx.db.insert("scheduledEmails", {
      userId: args.userId,
      flow: step.flow,
      template: step.template,
      status: "pending",
      runAt: now() + step.delayMs,
      createdAt: now(),
      updatedAt: now(),
    });
    await ctx.scheduler.runAfter(step.delayMs, internal.emails.sendStep, { emailId });
  }
}

// ---------------------------------------------------------------------------
// Cancel helpers. We mark pending rows "cancelled"; the scheduled sendStep
// re-checks status and no-ops, so we don't need to cancel the scheduler job.
// ---------------------------------------------------------------------------

async function cancelPendingStepsByTemplate(
  ctx: MutationCtx,
  userId: Id<"users">,
  template: StageEmailTemplate,
) {
  const rows = await ctx.db
    .query("scheduledEmails")
    .withIndex("by_user_template", (q) => q.eq("userId", userId).eq("template", template))
    .filter((q) => q.eq(q.field("status"), "pending"))
    .collect();
  await markCancelled(ctx, rows);
}

async function cancelPendingStepsByFlow(ctx: MutationCtx, userId: Id<"users">, flow: EmailFlow) {
  const rows = await ctx.db
    .query("scheduledEmails")
    .withIndex("by_user_flow", (q) => q.eq("userId", userId).eq("flow", flow))
    .filter((q) => q.eq(q.field("status"), "pending"))
    .collect();
  await markCancelled(ctx, rows);
}

async function markCancelled(ctx: MutationCtx, rows: { _id: Id<"scheduledEmails"> }[]) {
  for (const row of rows) {
    await ctx.db.patch(row._id, { status: "cancelled", updatedAt: now() });
  }
}

async function ensureUnsubscribeToken(ctx: MutationCtx, userId: Id<"users">) {
  const user = await ctx.db.get(userId);
  if (!user || user.emailUnsubscribeToken) return;
  await ctx.db.patch(userId, { emailUnsubscribeToken: crypto.randomUUID(), updatedAt: now() });
}

// ---------------------------------------------------------------------------
// markStep — terminal transition for a scheduled email.
// ---------------------------------------------------------------------------

export const markStepArgs = {
  emailId: v.id("scheduledEmails"),
  status: emailStatusV,
  resendEmailId: v.optional(v.string()),
  skipReason: v.optional(v.string()),
};

export async function markStepHandler(
  ctx: MutationCtx,
  args: {
    emailId: Id<"scheduledEmails">;
    status: "sent" | "skipped" | "cancelled" | "failed";
    resendEmailId?: string;
    skipReason?: string;
  },
) {
  await ctx.db.patch(args.emailId, {
    status: args.status,
    resendEmailId: args.resendEmailId,
    skipReason: args.skipReason,
    updatedAt: now(),
    ...(args.status === "sent" ? { sentAt: now() } : {}),
  });
}

// ---------------------------------------------------------------------------
// getSendContext — everything sendStep needs in one query (user + the row).
// Subscription status is fetched separately (see subscriptionStatus.ts) so the
// Stripe SDK doesn't bloat this query.
// ---------------------------------------------------------------------------

export type SendContext = {
  row: {
    _id: Id<"scheduledEmails">;
    status: string;
    template: StageEmailTemplate;
    flow: EmailFlow;
    userId: Id<"users">;
  } | null;
  user: {
    email: string | null;
    name: string | null;
    datafastVisitorId: string | null;
    appDownloadedAt: number | null;
    emailUnsubscribedAt: number | null;
    emailUnsubscribeToken: string | null;
  } | null;
};

export const getSendContextArgs = { emailId: v.id("scheduledEmails") };

export async function getSendContextHandler(
  ctx: QueryCtx,
  args: { emailId: Id<"scheduledEmails"> },
): Promise<SendContext> {
  const row = await ctx.db.get(args.emailId);
  if (!row) return { row: null, user: null };

  const user = await ctx.db.get(row.userId);
  if (!user) return { row: { _id: row._id, status: row.status, template: row.template, flow: row.flow, userId: row.userId }, user: null };

  return {
    row: { _id: row._id, status: row.status, template: row.template, flow: row.flow, userId: row.userId },
    user: {
      email: user.email ?? null,
      name: user.name ?? null,
      datafastVisitorId: user.datafastVisitorId ?? null,
      appDownloadedAt: user.appDownloadedAt ?? null,
      emailUnsubscribedAt: user.emailUnsubscribedAt ?? null,
      emailUnsubscribeToken: user.emailUnsubscribeToken ?? null,
    },
  };
}

// ---------------------------------------------------------------------------
// Unsubscribe — one-click opt-out via /emails/unsubscribe?token=...
// ---------------------------------------------------------------------------

export const setUnsubscribedByTokenArgs = { token: v.string() };

export async function setUnsubscribedByTokenHandler(
  ctx: MutationCtx,
  args: { token: string },
): Promise<{ ok: boolean }> {
  const user = await ctx.db
    .query("users")
    .withIndex("by_unsubscribe_token", (q) => q.eq("emailUnsubscribeToken", args.token))
    .first();
  if (!user) return { ok: false };

  if (!user.emailUnsubscribedAt) {
    await ctx.db.patch(user._id, { emailUnsubscribedAt: now(), updatedAt: now() });
  }
  // shouldSkip() would already block sends, but cancelling avoids needless
  // scheduler wake-ups for a user who opted out.
  await cancelPendingStepsByFlow(ctx, user._id, "trial");
  await cancelPendingStepsByFlow(ctx, user._id, "retention");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// handleEmailEvent — Resend delivery feedback. The component passes the full
// event object; we only act on hard failures (bounced / complained / failed)
// and mark the row failed. Other events (delivered/opened/...) are no-ops —
// the row is already "sent" and we don't store a per-event log.
// ---------------------------------------------------------------------------

export async function handleEmailEventHandler(
  ctx: MutationCtx,
  args: { id: EmailId; event: EmailEvent },
) {
  const row = await ctx.db
    .query("scheduledEmails")
    .withIndex("by_resend_email_id", (q) => q.eq("resendEmailId", args.id))
    .first();
  if (!row) return;

  const type = args.event.type;
  if (type === "email.bounced" || type === "email.complained" || type === "email.failed") {
    await ctx.db.patch(row._id, { status: "failed", skipReason: type, updatedAt: now() });
  }
}

// ---------------------------------------------------------------------------
// cleanupFinalizedEmails — cron. Physically delete terminal rows older than
// olderThanDays. Uses by_status_runAt so each status scan is indexed.
// ---------------------------------------------------------------------------

export const cleanupFinalizedEmailsArgs = {
  olderThanDays: v.number(),
  limit: v.number(),
};

export async function cleanupFinalizedEmailsHandler(
  ctx: MutationCtx,
  args: { olderThanDays: number; limit: number },
) {
  const cutoff = now() - args.olderThanDays * DAY;
  const terminal = ["sent", "skipped", "cancelled", "failed"] as const;
  let deleted = 0;

  for (const status of terminal) {
    if (deleted >= args.limit) break;
    const rows = await ctx.db
      .query("scheduledEmails")
      .withIndex("by_status_runAt", (q) => q.eq("status", status).lt("runAt", cutoff))
      .take(args.limit - deleted);
    for (const row of rows) {
      await ctx.db.delete(row._id);
      deleted += 1;
      if (deleted >= args.limit) break;
    }
  }
}

// ---------------------------------------------------------------------------
// Authed mutations called from the apps.
// ---------------------------------------------------------------------------

export const attachDatafastVisitorArgs = { datafastVisitorId: v.string() };

export async function attachDatafastVisitorHandler(
  ctx: MutationCtx,
  args: { datafastVisitorId: string },
) {
  const user = await requireAuthUser(ctx);
  if (user.datafastVisitorId === args.datafastVisitorId) return;
  await ctx.db.patch(user._id, { datafastVisitorId: args.datafastVisitorId, updatedAt: now() });
}

export const recordAppOpenedArgs = {};

export async function recordAppOpenedHandler(ctx: MutationCtx) {
  const user = await requireAuthUser(ctx);
  if (user.appDownloadedAt) return; // idempotent — only the first open fires the event
  await ctx.db.patch(user._id, { appDownloadedAt: now(), updatedAt: now() });
  await ctx.scheduler.runAfter(0, internal.emails.recordEmailEvent, {
    userId: user._id,
    type: "app_downloaded",
  });
}
