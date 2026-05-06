import { query } from "./_generated/server";
import { requireAuthUser } from "./_helpers";
import { getCurrentSubscriptionSnapshot } from "./billing";
import { resolveAssetUrl } from "./r2";

export const getIdentity = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuthUser(ctx);
    const subscription = await getCurrentSubscriptionSnapshot(ctx, String(user._id));

    return {
      id: String(user._id),
      email: user.email ?? "",
      name: user.name ?? "",
      avatarUrl: (await resolveAssetUrl(user.avatarUrl ?? user.image ?? null)) ?? undefined,
      role: user.role ?? "freelancer",
      plan: subscription?.plan ?? user.plan ?? "free",
    };
  },
});
