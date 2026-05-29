import type { ActionCtx } from "./_generated/server";
import { HttpRouterWithHono, type HonoWithConvex } from "convex-helpers/server/hono";
import { registerRoutes, type StripeComponent } from "@convex-dev/stripe";
import { components } from "./_generated/api";
import { auth } from "./auth";
import { apiApp } from "./api";
import { connectCallback, connectWebhook } from "./integrations/stripeConnect";
import { figmaConnectCallback, notionConnectCallback } from "./integrations/contentPlatforms";

const http = new HttpRouterWithHono(apiApp as HonoWithConvex<ActionCtx>);
auth.addHttpRoutes(http);
registerRoutes(http, (components as { stripe: StripeComponent }).stripe, {
  webhookPath: "/stripe/webhook",
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

export default http;
