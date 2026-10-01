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
      customAvatar,
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
      ...(customAvatar ? { customAvatar } : {}),
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

async function persistProfile(ctx: import("./_generated/server").MutationCtx, input: import("./lib/builderProfiles/fields").ProfileFields) {
  const user = await requireAuthUser(ctx);
  const fields = validateProfile(input);
  const existing = await ctx.db.query("builderProfiles").withIndex("by_user", q => q.eq("userId", user._id)).unique();
  const taken = await ctx.db.query("builderProfiles").withIndex("by_handle", q => q.eq("handle", fields.handle)).unique();
  if (taken && taken.userId !== user._id) throw new Error("This username is already taken.");
  if (existing) {
    await ctx.db.patch(existing._id, { ...fields, updatedAt: Date.now() });
    return existing._id;
  }
  return ctx.db.insert("builderProfiles", { ...fields, userId: user._id, items: [], updatedAt: Date.now() });
}
export const save = mutation({ args: profileFields, handler: persistProfile });

export const username = query({
  args: { handle: v.string() },
  handler: async (ctx, { handle }) => {
    const user = await requireAuthUser(ctx);
    const normalized = handle.trim().toLowerCase();
    if (!/^[a-z0-9_]{2,24}$/.test(normalized)) return { available: false, suggestion: "" };
    const free = async (value: string) => {
      const row = await ctx.db.query("builderProfiles").withIndex("by_handle", q => q.eq("handle", value)).unique();
      return !row || row.userId === user._id;
    };
    if (await free(normalized)) return { available: true, suggestion: normalized };
    for (let suffix = 1; suffix <= 100; suffix++) {
      const candidate = normalized.slice(0, 24 - String(suffix).length) + suffix;
      if (await free(candidate)) return { available: false, suggestion: candidate };
    }
    return { available: false, suggestion: "" };
  },
});

export const saveSetupStep = mutation({
  args: { profile: v.object(profileFields), step: v.union(v.literal(1), v.literal(2), v.literal(3)), items: v.array(v.string()) },
  handler: async (ctx, { profile, step, items }) => {
    const user = await requireAuthUser(ctx);
    const current = await ctx.db.query("builderProfiles").withIndex("by_user", q => q.eq("userId", user._id)).unique();
    if (step > (current?.onboardingStep ?? 0) + 1) throw new Error("Finish the previous step first.");
    if (items.length > marketplaceIds.length || items.some(id => !marketplaceIds.includes(id))) throw new Error("Choose resources from the marketplace.");
    const id = await persistProfile(ctx, profile);
    await ctx.db.patch(id, { onboardingStep: Math.max(current?.onboardingStep ?? 0, step), items: [...new Set(items)] });
    return id;
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
    if (!profile) {
      if (!saved) return { saved: false };
      const base = (user.name || "builder").toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 18).replace(/^_+|_+$/g, "") || "builder";
      let handle = base.length < 2 ? `${base}_` : base;
      let suffix = 1;
      while (await ctx.db.query("builderProfiles").withIndex("by_handle", q => q.eq("handle", handle)).unique()) handle = `${base}_${suffix++}`;
      const id = await persistProfile(ctx, {name:(user.name || "Builder").slice(0,60),handle,bio:"",location:"",roles:[],technologies:[],banner:"banner-4",github:"",x:"",instagram:"",linkedin:"",website:"",email:"",published:false});
      await ctx.db.patch(id, {items:[itemId], updatedAt:Date.now()});
      return {saved:true};
    }
    const items = saved
      ? [...new Set([...profile.items, itemId])]
      : profile.items.filter((id) => id !== itemId);
    await ctx.db.patch(profile._id, { items, updatedAt: Date.now() });
    return { saved };
  },
});
