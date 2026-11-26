"use node";
import { v } from "convex/values";
import { internalAction } from "../_generated/server";

// Every request to the design libraries (Mobbin, Details) goes through here: Convex's default runtime can't
// reach Mobbin's servers (Vercel; "error sending request", 2026-11-26), the Node.js runtime can.
export const send = internalAction({
  args: { url: v.string(), method: v.string(), headers: v.record(v.string(), v.string()), body: v.optional(v.string()) },
  handler: async (_ctx, args) => {
    const response = await fetch(args.url, { method: args.method, headers: args.headers, body: args.body });
    return {
      status: response.status,
      contentType: response.headers.get("Content-Type") ?? undefined,
      mcpSessionId: response.headers.get("Mcp-Session-Id") ?? undefined,
      body: await response.text(),
    };
  },
});
