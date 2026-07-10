import { action, internalAction, internalMutation, internalQuery, query } from "./_generated/server";
import * as handlers from "./lib/billing/handlers";
import * as subscriptionMirror from "./lib/billing/handlers/subscriptionMirror";
export { getCurrentSubscriptionSnapshot } from "./lib/billing/handlers";

export const syncSubscriptionMirror = internalMutation({
  args: subscriptionMirror.syncSubscriptionMirrorArgs,
  handler: subscriptionMirror.syncSubscriptionMirrorHandler,
});

export const markSubscriptionMirrorCanceled = internalMutation({
  args: subscriptionMirror.markSubscriptionMirrorCanceledArgs,
  handler: subscriptionMirror.markSubscriptionMirrorCanceledHandler,
});

export const backfillSubscriptionMirrors = internalAction({
  args: {},
  handler: handlers.backfillSubscriptionMirrorsHandler,
});

export const capTrialingWalletsTo150 = internalAction({
  args: handlers.capTrialingWalletsTo150Args,
  handler: handlers.capTrialingWalletsTo150Handler,
});

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

export const endTrialNow = action({
  args: handlers.endTrialNowArgs,
  handler: handlers.endTrialNowHandler,
});

export const handleSuccessfulPaymentEvent = action({
  args: handlers.handleSuccessfulPaymentEventArgs,
  handler: handlers.handleSuccessfulPaymentEventHandler,
});
