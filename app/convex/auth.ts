import Google from "@auth/core/providers/google";
import { ConvexCredentials } from "@convex-dev/auth/providers/ConvexCredentials";
import {
  convexAuth,
  createAccount,
  retrieveAccount,
  type GenericActionCtxWithAuthConfig,
} from "@convex-dev/auth/server";
import type { Value } from "convex/values";
import { internal } from "./_generated/api";
import { LoopsOTP } from "./LoopsOTP";

function now() {
  return Date.now();
}

function getEnv(name: string) {
  return (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.[
    name
  ];
}

function buildNameFromEmail(email: string) {
  const [localPart] = email.split("@");
  if (!localPart) {
    return "Stage User";
  }

  const parts = localPart
    .split(/[._-]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1));

  return parts.length > 0 ? parts.join(" ") : "Stage User";
}

const DEMO_PROVIDER_ID = "demo";
const DEMO_EMAIL = (getEnv("DEMO_EMAIL") ?? "demo@getstage.co").trim().toLowerCase();
const DEMO_NAME = (getEnv("DEMO_NAME") ?? "Stage Demo").trim();
const DEMO_CURRENCY = (getEnv("DEMO_CURRENCY") ?? "USD").trim().toUpperCase();

const Demo = ConvexCredentials({
  id: DEMO_PROVIDER_ID,
  authorize: async (
    _params: Partial<Record<string, Value | undefined>>,
    ctx: GenericActionCtxWithAuthConfig<any>,
  ) => {
    let existing = await retrieveAccount(ctx, {
      provider: DEMO_PROVIDER_ID,
      account: { id: DEMO_EMAIL },
    }).catch(() => null);

    if (!existing) {
      existing = await createAccount(ctx, {
        provider: DEMO_PROVIDER_ID,
        account: { id: DEMO_EMAIL },
        profile: {
          email: DEMO_EMAIL,
          name: DEMO_NAME,
          role: "freelancer",
          plan: "pro",
          createdAt: now(),
          updatedAt: now(),
        },
        shouldLinkViaEmail: false,
        shouldLinkViaPhone: false,
      });
    }

    await ctx.runMutation(internal.demo.resetAndSeedDemoWorkspace, {
      userId: existing.user._id,
      email: DEMO_EMAIL,
      name: DEMO_NAME,
      currency: DEMO_CURRENCY,
    });

    return { userId: existing.user._id };
  },
});

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Google, LoopsOTP, Demo],
  callbacks: {
    async afterUserCreatedOrUpdated(ctx, { userId, profile }) {
      const user = await ctx.db.get(userId);
      if (!user) {
        return;
      }

      const patch: Record<string, string | number> = {
        updatedAt: now(),
      };

      if (user.createdAt === undefined) {
        patch.createdAt = now();
      }

      if (user.role === undefined) {
        patch.role = "freelancer";
      }

      if (user.plan === undefined) {
        patch.plan = "free";
      }

      if (!user.name && typeof profile.email === "string") {
        patch.name = buildNameFromEmail(profile.email);
      }

      if (!user.avatarUrl) {
        const avatarUrl =
          typeof profile.image === "string"
            ? profile.image
            : typeof user.image === "string"
              ? user.image
              : null;

        if (avatarUrl) {
          patch.avatarUrl = avatarUrl;
        }
      }

      if (Object.keys(patch).length > 1) {
        await ctx.db.patch(userId, patch);
      }
    },
  },
});
