import { v } from "convex/values";
import { httpAction, internalMutation, internalQuery, mutation, query } from "../_generated/server";
import { internal } from "../_generated/api";
import { requireAuthUser } from "../_helpers";
import { getCurrentSubscriptionSnapshot } from "../billing";
import { listActiveMembershipsForUser } from "../helpers/access/seatEntitlement";
import type { Id } from "../_generated/dataModel";
import { generateRawKey, hashKey, planAllowsKey } from "./apiKeys";
import { isMcpPermission, withNeeded } from "../../src/domain/mcpPermissions";

// Connecting an AI tool (Claude, Cursor, …) over MCP:
// 1. The MCP server sends the signed-in user to the web app's connect page with a PKCE challenge.
// 2. The page calls `createConnectCode` and hands the one-time code back to the MCP server.
// 3. The MCP server redeems the code with its verifier and gets an MCP key for that user.
const CODE_LIFETIME_MS = 5 * 60 * 1000;

function base64Url(bytes: ArrayBuffer) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export const createConnectCode = mutation({
  args: {
    codeChallenge: v.string(),
    clientName: v.string(),
    workspaceIds: v.array(v.string()),
    permissions: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);
    const subscription = await getCurrentSubscriptionSnapshot(ctx, String(user._id));
    const plan = subscription?.plan ?? user.plan ?? "free";
    if (!planAllowsKey("mcp", plan)) {
      throw new Error("Connecting an AI tool needs a paid Stage plan.");
    }
    if (!/^[A-Za-z0-9_-]{43}$/.test(args.codeChallenge)) {
      throw new Error("This connect link is invalid. Start connecting again from your AI tool.");
    }
    const memberships = await listActiveMembershipsForUser(ctx, user._id);
    const allowedWorkspaces = new Map<string, Id<"users">>([[String(user._id), user._id]]);
    for (const membership of memberships) allowedWorkspaces.set(String(membership.ownerUserId), membership.ownerUserId);
    const workspaceIds: Id<"users">[] = [];
    for (const id of new Set(args.workspaceIds)) {
      const workspaceId = allowedWorkspaces.get(id);
      if (!workspaceId) throw new Error("You don't have access to one of the chosen workspaces.");
      workspaceIds.push(workspaceId);
    }
    if (workspaceIds.length === 0) throw new Error("Choose at least one workspace.");
    const unknown = args.permissions.filter((permission) => !isMcpPermission(permission));
    if (unknown.length > 0) throw new Error(`Unknown permission: ${unknown.join(", ")}.`);
    // A step always comes with the steps it is built on.
    const permissions = withNeeded(args.permissions.filter(isMcpPermission));

    const clientName = args.clientName.trim().slice(0, 48) || "AI tool";
    const code = generateRawKey();
    await ctx.db.insert("mcpConnectCodes", {
      userId: user._id,
      hashedCode: await hashKey(code),
      codeChallenge: args.codeChallenge,
      clientName,
      workspaceIds,
      permissions,
      expiresAt: Date.now() + CODE_LIFETIME_MS,
    });
    return { code };
  },
});

export const redeemConnectCode = internalMutation({
  args: { code: v.string(), verifier: v.string() },
  handler: async (ctx, args) => {
    const hashedCode = await hashKey(args.code);
    const record = await ctx.db
      .query("mcpConnectCodes")
      .withIndex("by_hashed_code", (q) => q.eq("hashedCode", hashedCode))
      .unique();
    if (!record || record.usedAt || record.expiresAt < Date.now()) return { ok: false as const };
    await ctx.db.patch(record._id, { usedAt: Date.now() });
    const challenge = base64Url(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(args.verifier)));
    if (challenge !== record.codeChallenge) return { ok: false as const };

    const apiKey = generateRawKey();
    await ctx.db.insert("apiKeys", {
      userId: record.userId,
      hashedKey: await hashKey(apiKey),
      name: `MCP · ${record.clientName}`,
      kind: "mcp",
      mcpWorkspaceIds: record.workspaceIds,
      mcpPermissions: record.permissions ?? [],
      createdAt: Date.now(),
    });
    return { ok: true as const, apiKey, userId: String(record.userId), permissions: record.permissions ?? [] };
  },
});

// The user's connected AI tools. A tool counts as connected once it has called Stage (`lastUsedAt`).
export const listConnections = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuthUser(ctx);
    const keys = await ctx.db
      .query("apiKeys")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    return keys
      .filter((key) => key.kind === "mcp" && !key.revokedAt)
      .map((key) => ({ id: key._id, clientName: key.name.replace(/^MCP · /, ""), lastUsedAt: key.lastUsedAt }));
  },
});

// Disconnect = revoke the tool's MCP keys; the tool has to sign in again to reconnect.
export const disconnect = mutation({
  args: { ids: v.array(v.id("apiKeys")) },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);
    for (const id of args.ids) {
      const key = await ctx.db.get(id);
      if (key?.userId !== user._id || key.kind !== "mcp" || key.revokedAt) continue;
      await ctx.db.patch(id, { revokedAt: Date.now() });
    }
  },
});

export const getProjectWorkspace = internalQuery({
  args: { projectId: v.string() },
  handler: async (ctx, args) => {
    const projectId = ctx.db.normalizeId("projects", args.projectId);
    const project = projectId ? await ctx.db.get(projectId) : null;
    return project ? project.userId : null;
  },
});

// Called by the MCP server only. The code is single-use and bound to the server's PKCE verifier.
export const exchangeConnectCode = httpAction(async (ctx, request) => {
  const body: unknown = await request.json().catch(() => undefined);
  const code = typeof body === "object" && body && "code" in body ? body.code : undefined;
  const verifier = typeof body === "object" && body && "verifier" in body ? body.verifier : undefined;
  if (typeof code !== "string" || typeof verifier !== "string") {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }
  const result = await ctx.runMutation(internal.developer.mcpConnect.redeemConnectCode, { code, verifier });
  if (!result.ok) return Response.json({ error: "invalid_grant" }, { status: 400 });
  return Response.json({ apiKey: result.apiKey, userId: result.userId, permissions: result.permissions });
});
