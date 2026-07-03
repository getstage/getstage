import { internalAction, internalMutation, internalQuery, mutation } from "./_generated/server";
import { vOnEmailEventArgs } from "@convex-dev/resend";
import * as handlers from "./lib/emails/handlers";
import * as sendStepLib from "./lib/emails/sendStep";
import * as subscriptionStatus from "./lib/emails/subscriptionStatus";

// Thin transport — all logic lives in lib/emails/*.ts.
// See EMAIL_FLOWS_PLAN.md for the flow definitions and event wiring.

// Internal — driven by the scheduler (sendStep), by other mutations/actions
// (recordEmailEvent), by the Resend webhook (handleEmailEvent), and by the
// unsubscribe http route (setUnsubscribedByToken) + cron (cleanupFinalizedEmails).
export const recordEmailEvent = internalMutation({
  args: handlers.recordEmailEventArgs,
  handler: handlers.recordEmailEventHandler,
});

export const sendStep = internalAction({
  args: sendStepLib.sendStepArgs,
  handler: sendStepLib.sendStepHandler,
});

export const markStep = internalMutation({
  args: handlers.markStepArgs,
  handler: handlers.markStepHandler,
});

export const getSendContext = internalQuery({
  args: handlers.getSendContextArgs,
  handler: handlers.getSendContextHandler,
});

export const getSubscriptionStatus = internalQuery({
  args: subscriptionStatus.getSubscriptionStatusArgs,
  handler: subscriptionStatus.getSubscriptionStatusHandler,
});

export const setUnsubscribedByToken = internalMutation({
  args: handlers.setUnsubscribedByTokenArgs,
  handler: handlers.setUnsubscribedByTokenHandler,
});

export const handleEmailEvent = internalMutation({
  args: vOnEmailEventArgs,
  handler: handlers.handleEmailEventHandler,
});

export const cleanupFinalizedEmails = internalMutation({
  args: handlers.cleanupFinalizedEmailsArgs,
  handler: handlers.cleanupFinalizedEmailsHandler,
});

// Authed — called from the apps.
export const attachDatafastVisitor = mutation({
  args: handlers.attachDatafastVisitorArgs,
  handler: handlers.attachDatafastVisitorHandler,
});

export const recordAppOpened = mutation({
  args: handlers.recordAppOpenedArgs,
  handler: handlers.recordAppOpenedHandler,
});
