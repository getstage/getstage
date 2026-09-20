import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { hashInviteToken } from "./platform/inviteTokens";

type InvitePreview =
  | { status: "invalid" }
  | {
      status: "pending" | "accepted" | "revoked" | "expired";
      inviterName: string;
      invitedEmail: string;
      expiresAt: number;
    };

type AcceptInviteResult = {
  ownerUserId: Id<"users">;
  alreadyAccepted: boolean;
};

const invitePreview = v.union(
  v.object({ status: v.literal("invalid") }),
  v.object({
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("revoked"),
      v.literal("expired"),
    ),
    inviterName: v.string(),
    invitedEmail: v.string(),
    expiresAt: v.number(),
  }),
);

export const preview = action({
  args: { token: v.string() },
  returns: invitePreview,
  handler: async (ctx, args): Promise<InvitePreview> => {
    const tokenHash = await hashInviteToken(args.token);
    return (await ctx.runQuery(internal.domain.collaborators.invites.previewByTokenHash, {
      tokenHash,
    })) as InvitePreview;
  },
});

export const accept = action({
  args: { token: v.string() },
  returns: v.object({
    ownerUserId: v.id("users"),
    alreadyAccepted: v.boolean(),
  }),
  handler: async (ctx, args): Promise<AcceptInviteResult> => {
    const tokenHash = await hashInviteToken(args.token);
    return (await ctx.runMutation(internal.domain.collaborators.invites.acceptByTokenHash, {
      tokenHash,
    })) as AcceptInviteResult;
  },
});
