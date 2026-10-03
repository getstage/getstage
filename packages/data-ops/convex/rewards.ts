import { action, internalMutation, query } from "./_generated/server";
import * as handlers from "./lib/rewards/handlers";

export const claimXShareReward = action({
  args: handlers.claimXShareRewardArgs,
  handler: handlers.claimXShareRewardHandler,
});

export const myRewardClaim = query({ args: {}, handler: handlers.myRewardClaimHandler });

export const reserveClaim = internalMutation({ args: handlers.reserveClaimArgs, handler: handlers.reserveClaimHandler });
export const completeClaim = internalMutation({ args: handlers.completeClaimArgs, handler: handlers.completeClaimHandler });
export const releaseClaim = internalMutation({ args: handlers.releaseClaimArgs, handler: handlers.releaseClaimHandler });
