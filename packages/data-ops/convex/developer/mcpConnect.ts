import { v } from "convex/values";
import { httpAction, internalMutation, mutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { requireAuthUser } from "../_helpers";
import { getCurrentSubscriptionSnapshot } from "../billing";
import { generateRawKey, hashKey, planAllowsKey } from "./apiKeys";

// Connecting an AI tool (Claude, Cursor, …) over MCP:
// 1. The MCP server sends the signed-in user to the web app's connect page with a PKCE challenge.
// 2. The page calls `createConnectCode` and hands the one-time code back to the MCP server.
// 3. The MCP server redeems the code with its verifier and gets an MCP key for that user.
const CODE_LIFETIME_MS = 5 * 60 * 1000;

function base64Url(bytes: ArrayBuffer) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export const createConnectCode = mutation({
  args: { codeChallenge: v.string(), clientName: v.string() },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);
    const subscription = await getCurrentSubscriptionSnapshot(ctx, String(user._id));
    const plan = subscription?.plan ?? user.plan ?? "free";
    if (!planAllowsKey("mcp", plan)) {
      throw new Error("Connecting an AI tool needs Stage Studio or Agency.");
    }
    if (!/^[A-Za-z0-9_-]{43}$/.test(args.codeChallenge)) {
      throw new Error("This connect link is invalid. Start connecting again from your AI tool.");
    }
    const clientName = args.clientName.trim().slice(0, 48) || "AI tool";
    const code = generateRawKey();
    await ctx.db.insert("mcpConnectCodes", {
      userId: user._id,
      hashedCode: await hashKey(code),
      codeChallenge: args.codeChallenge,
      clientName,
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
      createdAt: Date.now(),
    });
    return { ok: true as const, apiKey, userId: String(record.userId) };
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
  return Response.json({ apiKey: result.apiKey, userId: result.userId });
});
