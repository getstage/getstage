import Google from "@auth/core/providers/google";
import { convexAuth } from "@convex-dev/auth/server";
import { LoopsOTP } from "./LoopsOTP";

function now() {
  return Date.now();
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

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Google, LoopsOTP],
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
