import { v } from "convex/values";
import { internalAction, internalMutation } from "../_generated/server";
import * as research from "../lib/projectAi/research/mcp";
import { jobs } from "./jobs";

// Research for AI tools: collect the UI pattern screens (Refero for apps, Details for websites), one step per
// screen type. Started by start_research (projectAi:startResearchForApi); progress via get_run_status.

export const collect = jobs.define({ args: research.collectResearchReferencesArgs, returns: v.string() }).handler(research.collectResearchReferencesHandler);

export const searchGroup = internalAction({ args: research.searchReferenceGroupForApiArgs, handler: research.searchReferenceGroupForApiHandler });

export const collected = internalMutation({ args: research.researchReferencesCollectedArgs, handler: research.researchReferencesCollectedHandler });
