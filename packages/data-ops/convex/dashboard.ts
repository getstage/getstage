import { query } from "./_generated/server";
import { requireAuthUser } from "./_helpers";
import { buildDashboardOverview } from "./lib/dashboard/overview";

export const getOverview = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuthUser(ctx);
    return buildDashboardOverview(ctx, user._id);
  },
});
