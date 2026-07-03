import type { ActionCtx } from "./_generated/server";
import { httpAction } from "./_generated/server";
import { HttpRouterWithHono, type HonoWithConvex } from "convex-helpers/server/hono";
import { registerRoutes, type StripeComponent } from "@convex-dev/stripe";
import { components } from "./_generated/api";
import { auth } from "./auth";
import { apiApp } from "./api";
import { connectCallback, connectWebhook } from "./integrations/stripeConnect";
import { figmaConnectCallback, notionConnectCallback } from "./integrations/contentPlatforms";
import { creditWebhookEvents } from "./lib/billing/handlers/webhooks";
import { resend } from "./lib/emails/client";
import { unsubscribeHandler } from "./lib/emails/unsubscribe";

const http = new HttpRouterWithHono(apiApp as HonoWithConvex<ActionCtx>);
auth.addHttpRoutes(http);
registerRoutes(http, (components as { stripe: StripeComponent }).stripe, {
  webhookPath: "/stripe/webhook",
  events: { ...creditWebhookEvents },
});
http.route({
  path: "/stripe/connect/callback",
  method: "GET",
  handler: connectCallback,
});
http.route({
  path: "/stripe/connect/webhook",
  method: "POST",
  handler: connectWebhook,
});
http.route({
  path: "/integrations/notion/callback",
  method: "GET",
  handler: notionConnectCallback,
});
http.route({
  path: "/integrations/figma/callback",
  method: "GET",
  handler: figmaConnectCallback,
});

// Resend delivery feedback (delivered/bounced/opened) → updates scheduledEmails
// rows via the onEmailEvent callback. Create this webhook in the Resend dashboard
// pointing at {CONVEX_SITE_URL}/resend-webhook with all email.* events enabled.
http.route({
  path: "/resend-webhook",
  method: "POST",
  handler: httpAction(async (ctx, req) => resend.handleResendEventWebhook(ctx, req)),
});

// One-click unsubscribe landing page linked from every email footer.
http.route({
  path: "/emails/unsubscribe",
  method: "GET",
  handler: unsubscribeHandler,
});

export default http;
