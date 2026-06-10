/**
 * Google Sheets integration endpoints — registered here only.
 * Logic: `lib/integrations/googleSheets/handlers/*`
 */
import { action, internalMutation, internalQuery, mutation, query } from "../_generated/server";
import * as connectionHandlers from "../lib/integrations/googleSheets/handlers/connection";
import * as importHandlers from "../lib/integrations/googleSheets/handlers/import";

export const getSheetConnectionStatus = query({
  args: connectionHandlers.getSheetConnectionStatusArgs,
  returns: connectionHandlers.getSheetConnectionStatusReturns,
  handler: connectionHandlers.getSheetConnectionStatusHandler,
});

export const getConnectionForImport = internalQuery({
  args: connectionHandlers.getConnectionForImportArgs,
  handler: connectionHandlers.getConnectionForImportHandler,
});

export const getProjectsForImport = internalQuery({
  args: importHandlers.getProjectsForImportArgs,
  handler: importHandlers.getProjectsForImportHandler,
});

export const getClientsForImport = internalQuery({
  args: importHandlers.getClientsForImportArgs,
  handler: importHandlers.getClientsForImportHandler,
});

export const upsertSheetConnection = internalMutation({
  args: connectionHandlers.upsertSheetConnectionArgs,
  handler: connectionHandlers.upsertSheetConnectionHandler,
});

export const applyImportedEntries = internalMutation({
  args: importHandlers.applyImportedEntriesArgs,
  handler: importHandlers.applyImportedEntriesHandler,
});

export const markImportError = internalMutation({
  args: importHandlers.markImportErrorArgs,
  handler: importHandlers.markImportErrorHandler,
});

export const connectSheet = mutation({
  args: connectionHandlers.connectSheetArgs,
  handler: connectionHandlers.connectSheetHandler,
});

export const generateUploadUrl = mutation({
  args: connectionHandlers.generateUploadUrlArgs,
  handler: connectionHandlers.generateUploadUrlHandler,
});

export const uploadCsv = mutation({
  args: connectionHandlers.uploadCsvArgs,
  handler: connectionHandlers.uploadCsvHandler,
});

export const disconnectSheet = mutation({
  args: connectionHandlers.disconnectSheetArgs,
  handler: connectionHandlers.disconnectSheetHandler,
});

export const runSheetImport = action({
  args: importHandlers.runSheetImportArgs,
  handler: importHandlers.runSheetImportHandler,
});
