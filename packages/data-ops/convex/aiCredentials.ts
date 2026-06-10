import { action, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import * as handlers from "./lib/aiCredentials/handlers";

export const getAnthropicCredentialSummary = query({
  args: handlers.getAnthropicCredentialSummaryArgs,
  handler: handlers.getAnthropicCredentialSummaryHandler,
});

export const saveAnthropicKey = mutation({
  args: handlers.saveAnthropicKeyArgs,
  handler: handlers.saveAnthropicKeyHandler,
});

export const getCredentialForUser = internalQuery({
  args: handlers.getCredentialForUserArgs,
  handler: handlers.getCredentialForUserHandler,
});

export const updateCredentialStatus = internalMutation({
  args: handlers.updateCredentialStatusArgs,
  handler: handlers.updateCredentialStatusHandler,
});

export const testAnthropicKey = action({
  args: handlers.testAnthropicKeyArgs,
  handler: handlers.testAnthropicKeyHandler,
});
