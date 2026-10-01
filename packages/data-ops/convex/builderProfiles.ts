import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUser, requireAuthUser } from "./helpers/auth/requireAuthUser";
import { profileFields, validateProfile } from "./lib/builderProfiles/fields";
import { marketplaceIds } from "./lib/builderProfiles/catalog";

export const mine = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthUser(ctx);
    if (!user) return null;
    return await ctx.db
      .query("builderProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
  },
});

export const byHandle = query({
  args: { handle: v.string() },
  handler: async (ctx, { handle }) => {
    const profile = await ctx.db
      .query("builderProfiles")
      .withIndex("by_handle", (q) => q.eq("handle", handle.toLowerCase()))
      .unique();
    if (!profile?.published) return null;
    // Explicit projection: never expose the account ID, login email or internal timestamps.
    const {
      customBanner,
      name,
      bio,
      location,
      roles,
      technologies,
      banner,
      github,
      x,
      instagram,
      linkedin,
      website,
      email,
      items,
    } = profile;
    return {
      ...(customBanner ? { customBanner } : {}),
      name,
      handle: profile.handle,
      bio,
      location,
      roles,
      technologies,
      banner,
      github,
      x,
      instagram,
      linkedin,
      website,
      email,
      items,
      published: true,
    };
  },
});

export const save = mutation({
  args: profileFields,
  handler: async (ctx, input) => {
    const user = await requireAuthUser(ctx);
    const fields = validateProfile(input);
    const existing = await ctx.db
      .query("builderProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
    const taken = await ctx.db
      .query("builderProfiles")
      .withIndex("by_handle", (q) => q.eq("handle", fields.handle))
      .unique();
    if (taken && taken.userId !== user._id)
      throw new Error("This username is already taken.");
    if (existing) {
      await ctx.db.patch(existing._id, { ...fields, updatedAt: Date.now() });
      return existing._id;
    }
    return await ctx.db.insert("builderProfiles", {
      ...fields,
      userId: user._id,
      items: [],
      updatedAt: Date.now(),
    });
  },
});

export const setSaved = mutation({
  args: { itemId: v.string(), saved: v.boolean() },
  handler: async (ctx, { itemId, saved }) => {
    const user = await requireAuthUser(ctx);
    if (!marketplaceIds.includes(itemId))
      throw new Error("This resource is not in the marketplace.");
    const profile = await ctx.db
      .query("builderProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
    if (!profile)
      throw new Error("Set up your profile before saving resources.");
    const items = saved
      ? [...new Set([...profile.items, itemId])]
      : profile.items.filter((id) => id !== itemId);
    await ctx.db.patch(profile._id, { items, updatedAt: Date.now() });
    return { saved };
  },
});
