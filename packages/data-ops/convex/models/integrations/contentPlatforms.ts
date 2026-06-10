import { v } from "convex/values";
import type { Id } from "../../_generated/dataModel";

export type NativeProvider = "notion" | "figma";

export type ViewerContext = {
  userId: Id<"users">;
  userIdString: string;
  email: string;
  name: string;
};

export type TokenPayload = {
  accessToken: string;
  refreshToken?: string | null;
};

export const FIGMA_OAUTH_SCOPES = [
  "current_user:read",
  "file_content:read",
  "file_metadata:read",
  "file_dev_resources:read",
  "file_dev_resources:write",
] as const;

export const FIGMA_OAUTH_SCOPE_STRING = FIGMA_OAUTH_SCOPES.join(" ");

export const nativeConnectionSummaryValidator = v.union(
  v.object({
    id: v.string(),
    provider: v.union(v.literal("notion"), v.literal("figma")),
    status: v.string(),
    displayName: v.union(v.string(), v.null()),
    workspaceName: v.union(v.string(), v.null()),
    workspaceIcon: v.union(v.string(), v.null()),
    accountEmail: v.union(v.string(), v.null()),
    accountName: v.union(v.string(), v.null()),
    connectedAt: v.union(v.number(), v.null()),
    lastSyncedAt: v.union(v.number(), v.null()),
    lastError: v.union(v.string(), v.null()),
    defaultParentPageId: v.union(v.string(), v.null()),
    defaultParentPageUrl: v.union(v.string(), v.null()),
  }),
  v.null(),
);

export const getNativeConnectionStatusReturns = v.object({
  notion: nativeConnectionSummaryValidator,
  figma: nativeConnectionSummaryValidator,
});
