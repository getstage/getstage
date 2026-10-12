import { v } from "convex/values";
import { Presence } from "@convex-dev/presence";
import { components } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx } from "./_generated/server";
import { requireAuthUser, requireProjectAccess } from "./_helpers";
import { resolveAssetUrl } from "./r2";

// Live "who is here" for collaborative project screens. Rooms are named
// `<surface>:<projectId>:<detail>`; only people with project access can join one.
const presence = new Presence(components.presence);

async function requireRoomUser(ctx: MutationCtx, roomId: string) {
  const projectId = roomId.split(":")[1] as Id<"projects"> | undefined;
  if (!projectId) throw new Error("Invalid presence room.");
  const { user } = await requireProjectAccess(ctx, projectId);
  return user;
}

export const heartbeat = mutation({
  args: { roomId: v.string(), userId: v.string(), sessionId: v.string(), interval: v.number() },
  handler: async (ctx, { roomId, userId, sessionId, interval }) => {
    const user = await requireRoomUser(ctx, roomId);
    if (userId !== user._id) throw new Error("Not authorized.");
    return await presence.heartbeat(ctx, roomId, userId, sessionId, interval);
  },
});

export const list = query({
  args: { roomToken: v.string() },
  handler: async (ctx, { roomToken }) => {
    await requireAuthUser(ctx);
    return await presence.list(ctx, roomToken);
  },
});

// Where in the room the user is working (e.g. a Style Guide section), shown next to their avatar.
export const setFocus = mutation({
  args: { roomId: v.string(), focus: v.string() },
  handler: async (ctx, { roomId, focus }) => {
    const user = await requireRoomUser(ctx, roomId);
    await presence.updateRoomUser(ctx, roomId, user._id, {
      name: user.name ?? user.email ?? "Teammate",
      image: (await resolveAssetUrl(user.avatarUrl ?? user.image ?? null)) ?? undefined,
      focus: focus.slice(0, 40),
    });
  },
});

export const disconnect = mutation({
  args: { sessionToken: v.string() },
  // Called over HTTP from sendBeacon when the tab closes, so it cannot check auth.
  handler: async (ctx, { sessionToken }) => await presence.disconnect(ctx, sessionToken),
});
