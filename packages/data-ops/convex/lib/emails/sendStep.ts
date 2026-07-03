import { v } from "convex/values";
import type { ActionCtx } from "../../_generated/server";
import type { Id } from "../../_generated/dataModel";
import { internal } from "../../_generated/api";
import { getSiteUrl } from "../../helpers/env";
import { renderStageEmail, type StageEmailProps } from "stage-emails";
import { detectPlatform } from "./platform";
import { SUBJECTS } from "./config";
import type { SendContext } from "./handlers";

export const sendStepArgs = { emailId: v.id("scheduledEmails") };

// The Convex scheduler fires this for every scheduled email. It re-checks live
// state (status, unsubscribe, skip rules), renders the React template to HTML,
// hands it to Resend, and marks the row. Idempotent: if the row is no longer
// "pending" (cancelled/sent/etc.) it returns immediately.
export async function sendStepHandler(ctx: ActionCtx, args: { emailId: Id<"scheduledEmails"> }) {
  const { row, user } = (await ctx.runQuery(internal.emails.getSendContext, {
    emailId: args.emailId,
  })) as SendContext;

  if (!row || row.status !== "pending") return;

  if (!user || !user.email) {
    await mark(ctx, row._id, "skipped", "no_email");
    return;
  }

  if (user.emailUnsubscribedAt) {
    await mark(ctx, row._id, "skipped", "unsubscribed");
    return;
  }

  const skipReason = await computeSkip(ctx, row, user);
  if (skipReason) {
    await mark(ctx, row._id, "skipped", skipReason);
    return;
  }

  const firstName = (user.name ?? "").trim().split(" ")[0] || "there";
  const props: StageEmailProps = {
    firstName,
    unsubscribeUrl: buildUnsubscribeUrl(user.emailUnsubscribeToken),
  };

  let rendered: { html: string; text: string };
  try {
    rendered = await renderStageEmail(row.template, props);
  } catch (err) {
    console.error("[emails] render failed", { template: row.template, error: String(err) });
    await mark(ctx, row._id, "failed", "render_failed");
    return;
  }

  // Lazy import: ./client runs `new Resend(components.resend, { onEmailEvent:
  // internal.emails.handleEmailEvent })` at module load. Importing it eagerly
  // would form a cycle emails.ts → sendStep.ts → client.ts → _generated/api →
  // emails.ts and evaluate new Resend() before emails.ts has exported
  // handleEmailEvent (it'd be undefined). Loading here — inside the action, after
  // emails.ts is fully evaluated — breaks the cycle.
  const { resend, EMAIL_FROM } = await import("./client");
  try {
    const resendEmailId = await resend.sendEmail(ctx, {
      from: EMAIL_FROM,
      to: user.email,
      subject: SUBJECTS[row.template],
      html: rendered.html,
      text: rendered.text,
    });
    await mark(ctx, row._id, "sent", undefined, resendEmailId);
  } catch (err) {
    console.error("[emails] send threw", { template: row.template, error: String(err) });
    await mark(ctx, row._id, "failed", "send_threw");
  }
}

// Live skip rules, checked at send time (not at schedule time):
//  - download_reminder: skip if the app was downloaded, or the visitor isn't on
//    Mac (no point nagging a Windows user about a Mac app).
//  - any Flow A (trial) email: skip if the subscription is cancelling/cancelled.
async function computeSkip(
  ctx: ActionCtx,
  row: { template: string; flow: string; userId: Id<"users"> },
  user: { datafastVisitorId: string | null; appDownloadedAt: number | null },
): Promise<string | null> {
  if (row.template === "download_reminder") {
    if (user.appDownloadedAt) return "app_downloaded";
    const { isMac } = await detectPlatform(user.datafastVisitorId ?? undefined);
    if (!isMac) return "not_mac";
  }

  if (row.flow === "trial") {
    const sub = await ctx.runQuery(internal.emails.getSubscriptionStatus, { userId: row.userId });
    if (sub.status === "cancelling" || sub.status === "canceled" || sub.cancelAtPeriodEnd) {
      return "subscription_cancelling";
    }
  }

  return null;
}

async function mark(
  ctx: ActionCtx,
  emailId: Id<"scheduledEmails">,
  status: "sent" | "skipped" | "failed",
  skipReason?: string,
  resendEmailId?: string,
) {
  await ctx.runMutation(internal.emails.markStep, { emailId, status, skipReason, resendEmailId });
}

function buildUnsubscribeUrl(token: string | null): string {
  const site = getSiteUrl() || "https://getstage.co";
  if (!token) return `${site}/settings`;
  return `${site}/emails/unsubscribe?token=${encodeURIComponent(token)}`;
}
