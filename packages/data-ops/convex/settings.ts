import { action, internalMutation, mutation, query } from "./_generated/server";
import * as handlers from "./lib/settings/handlers";

export const getOverview = query({
  args: handlers.getOverviewArgs,
  handler: handlers.getOverviewHandler,
});

export const updateProfile = mutation({
  args: handlers.updateProfileArgs,
  handler: handlers.updateProfileHandler,
});

export const updatePortalBranding = mutation({
  args: handlers.updatePortalBrandingArgs,
  handler: handlers.updatePortalBrandingHandler,
});

export const cleanupOrphanClients = mutation({
  args: handlers.cleanupOrphanClientsArgs,
  handler: handlers.cleanupOrphanClientsHandler,
});

export const deleteAccountData = internalMutation({
  args: handlers.deleteAccountDataArgs,
  handler: handlers.deleteAccountDataHandler,
});

export const deleteAccount = action({
  args: handlers.deleteAccountArgs,
  handler: handlers.deleteAccountHandler,
});

export const updateSkillHubPrefs = mutation({
  args: handlers.updateSkillHubPrefsArgs,
  handler: handlers.updateSkillHubPrefsHandler,
});
