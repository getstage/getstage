import { v } from "convex/values";
import { internalQuery, mutation, query } from "./_generated/server";
import { requireAuthUser } from "./_helpers";

const workCategory = v.union(
  v.literal("branding"),
  v.literal("web-design"),
  v.literal("product-design"),
  v.literal("app-design"),
  v.literal("packaging"),
  v.literal("motion-design"),
  v.literal("illustration"),
  v.literal("other"),
);

function now() {
  return Date.now();
}

export const getState = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuthUser(ctx);

    return {
      workCategory: user.workCategory ?? null,
      completedAt: user.onboardingCompletedAt ?? null,
      projectCreatedAt: user.onboardingProjectCreatedAt ?? null,
      paywallSeenAt: user.onboardingPaywallSeenAt ?? null,
      isCompleted: Boolean(user.onboardingCompletedAt),
    };
  },
});

export const getViewerContext = internalQuery({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuthUser(ctx);

    return {
      userId: user._id,
      userIdString: String(user._id),
      email: user.email ?? "",
      name: user.name ?? "",
      plan: user.plan ?? "free",
      workCategory: user.workCategory ?? null,
    };
  },
});

export const saveFieldOfWork = mutation({
  args: {
    workCategory,
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);
    await ctx.db.patch(user._id, {
      workCategory: args.workCategory,
      updatedAt: now(),
    });

    return {
      workCategory: args.workCategory,
    };
  },
});

export const markProjectCreated = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuthUser(ctx);
    const timestamp = now();

    await ctx.db.patch(user._id, {
      onboardingProjectCreatedAt: timestamp,
      updatedAt: timestamp,
    });

    return {
      markedAt: timestamp,
    };
  },
});

export const completeOnboarding = mutation({
  args: {
    workCategory: v.optional(workCategory),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);
    const timestamp = now();

    await ctx.db.patch(user._id, {
      workCategory: args.workCategory ?? user.workCategory,
      onboardingCompletedAt: timestamp,
      onboardingPaywallSeenAt: timestamp,
      updatedAt: timestamp,
    });

    return {
      completedAt: timestamp,
      workCategory: args.workCategory ?? user.workCategory ?? null,
    };
  },
});
