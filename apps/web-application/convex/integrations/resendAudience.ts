import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { Resend } from "resend";

function getEnv(name: string) {
  return (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.[
    name
  ];
}

export const syncContactToResend = internalAction({
  args: {
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const apiKey = getEnv("STAGE_RESEND_API_KEY");
    const audienceId = getEnv("RESEND_AUDIENCE_ID");

    if (!apiKey || !audienceId) {
      console.warn(
        "[Resend] Missing STAGE_RESEND_API_KEY or RESEND_AUDIENCE_ID, skipping contact sync",
      );
      return;
    }

    const resend = new Resend(apiKey);
    const { error } = await resend.contacts.create({
      audienceId,
      email: args.email,
      firstName: args.firstName,
      lastName: args.lastName,
      unsubscribed: false,
    });

    if (error) {
      console.error(
        `[Resend] Failed to sync contact ${args.email}: ${error.name} ${error.message}`,
      );
    }
  },
});
