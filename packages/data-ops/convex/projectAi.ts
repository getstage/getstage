/**
 * Project AI Convex endpoints — registered here only.
 * Logic: `lib/projectAi/handlers/*` + `lib/projectAi/domain/*`
 */
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import * as apiHandlers from "./lib/projectAi/handlers/api";
import * as artifactHandlers from "./lib/projectAi/handlers/artifacts";
import * as contextHandlers from "./lib/projectAi/handlers/context";
import * as flowsHandlers from "./lib/projectAi/handlers/flows";
import * as moodboardHandlers from "./lib/projectAi/handlers/moodboard";
import * as researchHandlers from "./lib/projectAi/handlers/research";
import * as runHandlers from "./lib/projectAi/handlers/runs";
import * as strategyHandlers from "./lib/projectAi/handlers/strategy";
import * as wireframesHandlers from "./lib/projectAi/handlers/wireframes";

export const getContext = query({
  args: contextHandlers.getContextArgs,
  handler: contextHandlers.getContextHandler,
});

export const getResearchInput = query({
  args: contextHandlers.getResearchInputArgs,
  handler: contextHandlers.getResearchInputHandler,
});

export const upsertContext = mutation({
  args: contextHandlers.upsertContextArgs,
  handler: contextHandlers.upsertContextHandler,
});

export const listRuns = query({
  args: runHandlers.listRunsArgs,
  handler: runHandlers.listRunsHandler,
});

export const createRun = mutation({
  args: runHandlers.createRunArgs,
  handler: runHandlers.createRunHandler,
});

export const cancelRun = mutation({
  args: runHandlers.cancelRunArgs,
  handler: runHandlers.cancelRunHandler,
});

export const createResearchRun = mutation({
  args: researchHandlers.createResearchRunArgs,
  handler: researchHandlers.createResearchRunHandler,
});

export const clearResearchAndStrategyForRerun = mutation({
  args: researchHandlers.clearResearchAndStrategyForRerunArgs,
  handler: researchHandlers.clearResearchAndStrategyForRerunHandler,
});

export const completeResearchRun = mutation({
  args: researchHandlers.completeResearchRunArgs,
  handler: researchHandlers.completeResearchRunHandler,
});

export const failResearchRun = mutation({
  args: researchHandlers.failResearchRunArgs,
  handler: researchHandlers.failResearchRunHandler,
});

export const cleanupResearchRunAsset = mutation({
  args: researchHandlers.cleanupResearchRunAssetArgs,
  handler: researchHandlers.cleanupResearchRunAssetHandler,
});

export const getLatestResearchArtifact = query({
  args: researchHandlers.getLatestResearchArtifactArgs,
  handler: researchHandlers.getLatestResearchArtifactHandler,
});

export const updateResearchArtifact = mutation({
  args: researchHandlers.updateResearchArtifactArgs,
  handler: researchHandlers.updateResearchArtifactHandler,
});

export const upsertStrategyGenerateInput = mutation({
  args: strategyHandlers.upsertStrategyGenerateInputArgs,
  handler: strategyHandlers.upsertStrategyGenerateInputHandler,
});

export const getStrategyInput = query({
  args: strategyHandlers.getStrategyInputArgs,
  handler: strategyHandlers.getStrategyInputHandler,
});

export const createStrategyRun = mutation({
  args: strategyHandlers.createStrategyRunArgs,
  handler: strategyHandlers.createStrategyRunHandler,
});

export const completeStrategyRun = mutation({
  args: strategyHandlers.completeStrategyRunArgs,
  handler: strategyHandlers.completeStrategyRunHandler,
});

export const failStrategyRun = mutation({
  args: strategyHandlers.failStrategyRunArgs,
  handler: strategyHandlers.failStrategyRunHandler,
});

export const updateStrategyArtifact = mutation({
  args: strategyHandlers.updateStrategyArtifactArgs,
  handler: strategyHandlers.updateStrategyArtifactHandler,
});

export const getLatestStrategyArtifact = query({
  args: strategyHandlers.getLatestStrategyArtifactArgs,
  handler: strategyHandlers.getLatestStrategyArtifactHandler,
});

export const getLatestMoodboardArtifact = query({
  args: artifactHandlers.getLatestMoodboardArtifactArgs,
  handler: artifactHandlers.getLatestMoodboardArtifactHandler,
});

export const saveMoodboardArtifact = mutation({
  args: moodboardHandlers.saveMoodboardArtifactArgs,
  handler: moodboardHandlers.saveMoodboardArtifactHandler,
});

export const getConnectedFigmaAccessToken = query({
  args: moodboardHandlers.getConnectedFigmaAccessTokenArgs,
  handler: moodboardHandlers.getConnectedFigmaAccessTokenHandler,
});

export const getLatestFlowsArtifact = query({
  args: artifactHandlers.getLatestFlowsArtifactArgs,
  handler: artifactHandlers.getLatestFlowsArtifactHandler,
});

export const getFlowsInput = query({
  args: flowsHandlers.getFlowsInputArgs,
  handler: flowsHandlers.getFlowsInputHandler,
});

export const createFlowsRun = mutation({
  args: flowsHandlers.createFlowsRunArgs,
  handler: flowsHandlers.createFlowsRunHandler,
});

export const completeFlowsRun = mutation({
  args: flowsHandlers.completeFlowsRunArgs,
  handler: flowsHandlers.completeFlowsRunHandler,
});

export const failFlowsRun = mutation({
  args: flowsHandlers.failFlowsRunArgs,
  handler: flowsHandlers.failFlowsRunHandler,
});

export const updateFlowsArtifact = mutation({
  args: flowsHandlers.updateFlowsArtifactArgs,
  handler: flowsHandlers.updateFlowsArtifactHandler,
});

export const getLatestWireframesArtifact = query({
  args: artifactHandlers.getLatestWireframesArtifactArgs,
  handler: artifactHandlers.getLatestWireframesArtifactHandler,
});

export const getWireframesInput = query({
  args: wireframesHandlers.getWireframesInputArgs,
  handler: wireframesHandlers.getWireframesInputHandler,
});

export const createWireframesRun = mutation({
  args: wireframesHandlers.createWireframesRunArgs,
  handler: wireframesHandlers.createWireframesRunHandler,
});

export const completeWireframesRun = mutation({
  args: wireframesHandlers.completeWireframesRunArgs,
  handler: wireframesHandlers.completeWireframesRunHandler,
});

export const failWireframesRun = mutation({
  args: wireframesHandlers.failWireframesRunArgs,
  handler: wireframesHandlers.failWireframesRunHandler,
});

export const updateWireframesArtifact = mutation({
  args: wireframesHandlers.updateWireframesArtifactArgs,
  handler: wireframesHandlers.updateWireframesArtifactHandler,
});

export const getLatestAssetsArtifact = query({
  args: artifactHandlers.getLatestAssetsArtifactArgs,
  handler: artifactHandlers.getLatestAssetsArtifactHandler,
});

export const listArtifacts = query({
  args: artifactHandlers.listArtifactsArgs,
  handler: artifactHandlers.listArtifactsHandler,
});

export const setArtifactStatus = mutation({
  args: artifactHandlers.setArtifactStatusArgs,
  handler: artifactHandlers.setArtifactStatusHandler,
});

export const clearDownstreamArtifacts = mutation({
  args: artifactHandlers.clearDownstreamArtifactsArgs,
  handler: artifactHandlers.clearDownstreamArtifactsHandler,
});

export const requestArtifactDestination = mutation({
  args: artifactHandlers.requestArtifactDestinationArgs,
  handler: artifactHandlers.requestArtifactDestinationHandler,
});

export const getContextForApi = internalQuery({
  args: apiHandlers.getContextForApiArgs,
  handler: apiHandlers.getContextForApiHandler,
});

export const upsertContextForApi = internalMutation({
  args: apiHandlers.upsertContextForApiArgs,
  handler: apiHandlers.upsertContextForApiHandler,
});

export const listRunsForApi = internalQuery({
  args: apiHandlers.listRunsForApiArgs,
  handler: apiHandlers.listRunsForApiHandler,
});

export const createRunForApi = internalMutation({
  args: apiHandlers.createRunForApiArgs,
  handler: apiHandlers.createRunForApiHandler,
});

export const listArtifactsForApi = internalQuery({
  args: apiHandlers.listArtifactsForApiArgs,
  handler: apiHandlers.listArtifactsForApiHandler,
});

export const createArtifactForApi = internalMutation({
  args: apiHandlers.createArtifactForApiArgs,
  handler: apiHandlers.createArtifactForApiHandler,
});

export const upsertArtifactExportForApi = internalMutation({
  args: apiHandlers.upsertArtifactExportForApiArgs,
  handler: apiHandlers.upsertArtifactExportForApiHandler,
});
