import { getAuthUserId } from "@convex-dev/auth/server";
import { internalMutation, query } from "../_generated/server";
import * as shared from "../lib/references/sharedRefero";

// Stage's shared Refero access during the grace period (STA-78). Logic: `lib/references/sharedRefero.ts`.

export const claimLookup = internalMutation({ args: shared.claimSharedReferoLookupArgs, handler: shared.claimSharedReferoLookupHandler });

export const status = query({
  args: shared.sharedReferoStatusArgs,
  handler: async (ctx) => shared.sharedReferoStatusHandler(ctx, await getAuthUserId(ctx)),
});
