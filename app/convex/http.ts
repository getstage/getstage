import { httpRouter } from "convex/server";
import { registerRoutes, type StripeComponent } from "@convex-dev/stripe";
import { components } from "./_generated/api";
import { auth } from "./auth";
import { connectCallback } from "./stripeConnect";

const http = httpRouter();
auth.addHttpRoutes(http);
registerRoutes(http, (components as { stripe: StripeComponent }).stripe, {
  webhookPath: "/stripe/webhook",
});
http.route({
  path: "/stripe/connect/callback",
  method: "GET",
  handler: connectCallback,
});

export default http;
