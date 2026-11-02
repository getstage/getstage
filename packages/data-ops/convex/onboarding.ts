import { v } from "convex/values";
import { internalQuery, mutation, query } from "./_generated/server";
import { requireAuthUser } from "./_helpers";

const workCategory = v.union(
  v.literal("branding"),
  v.literal("web-design"),
  v.literal("product-design"),
  v.literal("app-design"),
  v.literal("web-app"),
  v.literal("packaging"),
  v.literal("motion-design"),
  v.literal("illustration"),
  v.literal("other"),
  v.literal("websites"),
  v.literal("web-apps"),
  v.literal("ios-apps"),
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
      // Answered on the web already, so the Mac onboarding can skip the questions.
      hasAnswers: Boolean(user.workMode && user.buildFor),
      workspaceName: user.workspaceName ?? null,
      usageChoice: user.usageChoice ?? null,
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

const trimmed = (value: string | undefined, max: number) => value?.trim().slice(0, max) || undefined;

export const saveAnswers = mutation({
  args: {
    discoverySource: v.optional(v.string()),
    discoveryHandle: v.optional(v.string()),
    workMode: v.optional(v.union(v.literal("solo"), v.literal("team"))),
    buildFor: v.optional(v.union(v.literal("client"), v.literal("own"))),
    workspaceName: v.optional(v.string()),
    inviteEmails: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);
    const emails = (args.inviteEmails ?? [])
      .map((email) => email.trim().toLowerCase())
      .filter((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      .slice(0, 20);
    await ctx.db.patch(user._id, {
      ...(args.discoverySource !== undefined ? { discoverySource: trimmed(args.discoverySource, 40) } : {}),
      ...(args.discoveryHandle !== undefined ? { discoveryHandle: trimmed(args.discoveryHandle, 120) } : {}),
      ...(args.workMode ? { workMode: args.workMode } : {}),
      ...(args.buildFor ? { buildFor: args.buildFor } : {}),
      ...(args.workspaceName !== undefined ? { workspaceName: trimmed(args.workspaceName, 80) } : {}),
      ...(args.inviteEmails !== undefined ? { pendingInviteEmails: [...new Set(emails)] } : {}),
      updatedAt: now(),
    });
    return null;
  },
});

// Web sign-up: the choice is asked once; returning users go straight to it.
export const saveUsageChoice = mutation({
  args: { choice: v.union(v.literal("mac"), v.literal("ai-tool")) },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);
    await ctx.db.patch(user._id, { usageChoice: args.choice, updatedAt: now() });
    return null;
  },
});
