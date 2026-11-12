import { internal } from "../_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import { enforceApiRequestRateLimit } from "../lib/rateLimits";
import { ApiError } from "./errors";
import type { ApiAuthContext, ApiContext, McpScope } from "./types";
import type { Id } from "../_generated/dataModel";
import { mcpPermissionLabel, permissionsForWrite } from "../../src/domain/mcpPermissions";

function getBearerToken(authorizationHeader: string | undefined) {
  if (!authorizationHeader) {
    throw new ApiError(401, "Missing Authorization header.", "missing_authorization");
  }

  const [scheme, token] = authorizationHeader.trim().split(/\s+/, 2);
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    throw new ApiError(401, "Authorization header must use Bearer auth.", "invalid_authorization");
  }

  return token;
}

async function hashApiKey(rawKey: string) {
  const encoded = new TextEncoder().encode(rawKey);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  const hashArray = new Uint8Array(hashBuffer);

  return Array.from(hashArray)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function asRateLimitMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (!message.includes("Too many API requests") && !message.includes("rate limit")) {
    return null;
  }
  return message;
}

// MCP keys: only the workspaces and per-step permissions chosen at sign-in, and only the routes the MCP tools use.
async function enforceMcpScope(c: ApiContext, userId: Id<"users">, mcp: McpScope) {
  const path = c.req.path.replace(/\/$/, "");
  const isWrite = c.req.method !== "GET";
  if (isWrite) {
    const needed = permissionsForWrite(path);
    if (!needed) throw new ApiError(403, "AI tools can't make this change in Stage.", "mcp_not_allowed");
    if (!needed.some((permission) => mcp.permissions.includes(permission))) {
      const label = needed.map(mcpPermissionLabel).join(" or ");
      throw new ApiError(403, `This AI tool isn't allowed to do ${label}. Connect Stage again and allow ${label}.`, "mcp_permission_denied");
    }
  }
  if (path === "/api/v1/references/search") return;
  if (path === "/api/v1/me" || (path === "/api/v1/projects" && !isWrite)) return;
  if (path === "/api/v1/projects" || path === "/api/v1/projects/import-plan") {
    if (mcp.workspaceIds.includes(userId)) return;
    throw new ApiError(403, "New projects go to your own workspace, which this AI tool can't use.", "mcp_workspace_denied");
  }
  const projectId = /^\/api\/v1\/projects\/([^/]+)/.exec(path)?.[1];
  const workspaceId = projectId && (await c.env.runQuery(internal.developer.mcpConnect.getProjectWorkspace, { projectId }));
  if (!workspaceId || !mcp.workspaceIds.includes(workspaceId)) {
    throw new ApiError(404, "Not found.", "not_found");
  }
}

export async function authenticateApiKey(c: ApiContext): Promise<ApiAuthContext> {
  const rawKey = getBearerToken(c.req.header("authorization"));
  const hashedKey = await hashApiKey(rawKey);
  const auth = await c.env.runMutation(internal.developer.apiKeys.authenticateByHashedKey, {
    hashedKey,
  });

  if (auth) {
    try {
      await enforceApiRequestRateLimit(c.env, String(auth.apiKeyId));
    } catch (error) {
      const message = asRateLimitMessage(error);
      if (message) {
        throw new ApiError(429, message, "rate_limited");
      }
      throw error;
    }

    if (auth.mcp) await enforceMcpScope(c, auth.userId, auth.mcp);
    return auth;
  }

  const authUserId = await getAuthUserId(c.env);
  if (!authUserId) {
    throw new ApiError(401, "Invalid API key or auth token.", "invalid_authorization");
  }

  try {
    await enforceApiRequestRateLimit(c.env, String(authUserId));
  } catch (error) {
    const message = asRateLimitMessage(error);
    if (message) {
      throw new ApiError(429, message, "rate_limited");
    }
    throw error;
  }

  return { userId: authUserId as Id<"users"> };
}
