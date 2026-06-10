/**
 * Content platform integrations endpoints — registered here only.
 * Logic: `lib/integrations/contentPlatforms/handlers/*`
 */
import {
  action,
  httpAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "../_generated/server";
import * as connectionHandlers from "../lib/integrations/contentPlatforms/handlers/connections";
import * as figmaJobHandlers from "../lib/integrations/contentPlatforms/handlers/figmaJobs";
import * as notionExportHandlers from "../lib/integrations/contentPlatforms/handlers/notionExport";
import * as oauthHandlers from "../lib/integrations/contentPlatforms/handlers/oauth";
import { getNativeConnectionStatusReturns } from "../models/integrations/contentPlatforms";

export const getNativeConnectionStatus = query({
  args: {},
  returns: getNativeConnectionStatusReturns,
  handler: connectionHandlers.getNativeConnectionStatusHandler,
});

export const disconnectConnection = mutation({
  args: connectionHandlers.disconnectConnectionArgs,
  handler: connectionHandlers.disconnectConnectionHandler,
});

export const startOAuthConnect = action({
  args: oauthHandlers.startOAuthConnectArgs,
  handler: oauthHandlers.startOAuthConnectHandler,
});

export const getConnectionByOAuthState = internalQuery({
  args: connectionHandlers.getConnectionByOAuthStateArgs,
  handler: connectionHandlers.getConnectionByOAuthStateHandler,
});

export const upsertPendingConnectionForOAuth = internalMutation({
  args: connectionHandlers.upsertPendingConnectionForOAuthArgs,
  handler: connectionHandlers.upsertPendingConnectionForOAuthHandler,
});

export const completeConnectionFromOAuth = internalMutation({
  args: connectionHandlers.completeConnectionFromOAuthArgs,
  handler: connectionHandlers.completeConnectionFromOAuthHandler,
});

export const markConnectionErrorByState = internalMutation({
  args: connectionHandlers.markConnectionErrorByStateArgs,
  handler: connectionHandlers.markConnectionErrorByStateHandler,
});

export const getConnectionTokenForProvider = internalQuery({
  args: connectionHandlers.getConnectionTokenForProviderArgs,
  handler: connectionHandlers.getConnectionTokenForProviderHandler,
});

export const getResearchArtifactForNotionExport = internalQuery({
  args: notionExportHandlers.getResearchArtifactForNotionExportArgs,
  handler: notionExportHandlers.getResearchArtifactForNotionExportHandler,
});

export const completeNotionResearchExport = internalMutation({
  args: notionExportHandlers.completeNotionResearchExportArgs,
  handler: notionExportHandlers.completeNotionResearchExportHandler,
});

export const exportResearchArtifactToNotion = action({
  args: notionExportHandlers.exportResearchArtifactToNotionArgs,
  handler: notionExportHandlers.exportResearchArtifactToNotionHandler,
});

export const getStrategyArtifactForNotionExport = internalQuery({
  args: notionExportHandlers.getStrategyArtifactForNotionExportArgs,
  handler: notionExportHandlers.getStrategyArtifactForNotionExportHandler,
});

export const completeNotionStrategyExport = internalMutation({
  args: notionExportHandlers.completeNotionStrategyExportArgs,
  handler: notionExportHandlers.completeNotionStrategyExportHandler,
});

export const exportStrategyArtifactToNotion = action({
  args: notionExportHandlers.exportStrategyArtifactToNotionArgs,
  handler: notionExportHandlers.exportStrategyArtifactToNotionHandler,
});

export const notionConnectCallback = httpAction(async (ctx, req) => {
  return oauthHandlers.notionConnectCallbackHandler(ctx, req);
});

export const figmaConnectCallback = httpAction(async (ctx, req) => {
  return oauthHandlers.figmaConnectCallbackHandler(ctx, req);
});

export const createFigmaCanvasExportJob = mutation({
  args: figmaJobHandlers.createFigmaCanvasExportJobArgs,
  handler: figmaJobHandlers.createFigmaCanvasExportJobHandler,
});

export const claimFigmaExportJob = internalMutation({
  args: figmaJobHandlers.claimFigmaExportJobArgs,
  handler: figmaJobHandlers.claimFigmaExportJobHandler,
});

export const heartbeatFigmaExportJob = internalMutation({
  args: figmaJobHandlers.heartbeatFigmaExportJobArgs,
  handler: figmaJobHandlers.heartbeatFigmaExportJobHandler,
});

export const completeFigmaExportJob = internalMutation({
  args: figmaJobHandlers.completeFigmaExportJobArgs,
  handler: figmaJobHandlers.completeFigmaExportJobHandler,
});

export const failFigmaExportJob = internalMutation({
  args: figmaJobHandlers.failFigmaExportJobArgs,
  handler: figmaJobHandlers.failFigmaExportJobHandler,
});

export const getFigmaExportJob = query({
  args: figmaJobHandlers.getFigmaExportJobArgs,
  handler: figmaJobHandlers.getFigmaExportJobHandler,
});
