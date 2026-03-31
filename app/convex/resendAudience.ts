import { internalAction } from "./_generated/server";
import { v } from "convex/values";

export const syncContactToResend = internalAction({
  args: {
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const apiKey = process.env.STAGE_RESEND_API_KEY;
    const audienceId = process.env.RESEND_AUDIENCE_ID;

    if (!apiKey || !audienceId) {
      console.warn(
        "[Resend] Missing STAGE_RESEND_API_KEY or RESEND_AUDIENCE_ID, skipping contact sync",
      );
      return;
    }

    const response = await fetch(
      `https://api.resend.com/audiences/${audienceId}/contacts`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: args.email,
          first_name: args.firstName ?? "",
          last_name: args.lastName ?? "",
          unsubscribed: false,
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `[Resend] Failed to sync contact ${args.email}: ${response.status} ${errorText}`,
      );
    }
  },
});
