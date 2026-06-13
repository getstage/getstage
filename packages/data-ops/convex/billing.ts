import { action, internalMutation, internalQuery, query } from "./_generated/server";
import * as handlers from "./lib/billing/handlers";
export { getCurrentSubscriptionSnapshot } from "./lib/billing/handlers";

export const getFirstPaymentEventState = internalQuery({
  args: handlers.getFirstPaymentEventStateArgs,
  handler: handlers.getFirstPaymentEventStateHandler,
});

export const markFirstPaymentEmailSent = internalMutation({
  args: handlers.markFirstPaymentEmailSentArgs,
  handler: handlers.markFirstPaymentEmailSentHandler,
});

export const getCurrentSubscription = query({
  args: handlers.getCurrentSubscriptionArgs,
  handler: handlers.getCurrentSubscriptionHandler,
});

export const createCheckoutSession = action({
  args: handlers.createCheckoutSessionArgs,
  handler: handlers.createCheckoutSessionHandler,
});

export const createCustomerPortalSession = action({
  args: handlers.createCustomerPortalSessionArgs,
  handler: handlers.createCustomerPortalSessionHandler,
});

export const handleSuccessfulPaymentEvent = action({
  args: handlers.handleSuccessfulPaymentEventArgs,
  handler: handlers.handleSuccessfulPaymentEventHandler,
});
