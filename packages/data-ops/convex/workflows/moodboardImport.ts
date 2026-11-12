import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery } from "../_generated/server";
import * as moodboard from "../lib/projectAi/moodboard/mcp";
import { jobs } from "./jobs";

// Moodboard import for AI tools: one step per Refero screen, image link or Figma link, then one step that adds
// them to the moodboard. Started by add_to_moodboard (projectAi:startMoodboardImportForApi); progress via get_run_status.

export const run = jobs.define({ args: moodboard.importMoodboardReferencesArgs, returns: v.string() }).handler(moodboard.importMoodboardReferencesHandler);

export const importItem = internalAction({ args: moodboard.importMoodboardItemForApiArgs, handler: moodboard.importMoodboardItemForApiHandler });

export const figmaAccessToken = internalQuery({ args: moodboard.figmaAccessTokenForApiArgs, handler: moodboard.figmaAccessTokenForApiHandler });

export const addToMoodboard = internalMutation({ args: moodboard.appendMoodboardReferencesForApiArgs, handler: moodboard.appendMoodboardReferencesForApiHandler });

export const finished = internalMutation({ args: moodboard.moodboardImportFinishedArgs, handler: moodboard.moodboardImportFinishedHandler });
