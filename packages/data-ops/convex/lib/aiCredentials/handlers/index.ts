import { v } from "convex/values";
import type { Doc, Id } from "../../../_generated/dataModel";
import type { ActionCtx, MutationCtx, QueryCtx } from "../../../_generated/server";
import { internal } from "../../../_generated/api";
import { requireAuthUser } from "../../../_helpers";
import { now } from "../../../helpers/time";
import { decryptSecret, encryptSecret } from "../../credentialVault";

const AI_PROVIDER = "anthropic";
const AI_LABEL = "claude";
const ANTHROPIC_VERSION = "2023-06-01";

async function encryptApiKey(rawApiKey: string) {
  const encrypted = await encryptSecret(rawApiKey);
  return {
    encryptedApiKey: encrypted.encryptedValue,
    encryptionIv: encrypted.encryptionIv,
  };
}

async function decryptApiKey(encryptedApiKey: string, encryptionIv: string) {
  return decryptSecret(encryptedApiKey, encryptionIv);
}

async function getCredentialRecord(ctx: QueryCtx | MutationCtx, userId: Id<"users">) {
  return ctx.db
    .query("aiProviderCredentials")
    .withIndex("by_user_provider", (q) => q.eq("userId", userId).eq("provider", AI_PROVIDER))
    .unique();
}

export const getAnthropicCredentialSummaryArgs = {};

export async function getAnthropicCredentialSummaryHandler(ctx: QueryCtx) {
  const user = await requireAuthUser(ctx);
  const credential = await getCredentialRecord(ctx, user._id);

  return credential
    ? {
        provider: credential.provider,
        label: credential.label,
        keyLast4: credential.keyLast4,
        modelPreference: credential.modelPreference ?? "claude-sonnet-4-5",
        status: credential.status,
        testedAt: credential.testedAt ?? null,
        hasSavedKey: true,
      }
    : {
        provider: AI_PROVIDER,
        label: AI_LABEL,
        keyLast4: null,
        modelPreference: "claude-sonnet-4-5",
        status: "untested" as const,
        testedAt: null,
        hasSavedKey: false,
      };
}

export const saveAnthropicKeyArgs = {
  apiKey: v.string(),
  modelPreference: v.optional(v.string()),
};

export async function saveAnthropicKeyHandler(
  ctx: MutationCtx,
  args: { apiKey: string; modelPreference?: string },
) {
  const user = await requireAuthUser(ctx);
  const trimmedKey = args.apiKey.trim();
  if (trimmedKey.length < 16) {
    throw new Error("Enter a valid Anthropic API key.");
  }

  const encrypted = await encryptApiKey(trimmedKey);
  const timestamp = now();
  const existing = await getCredentialRecord(ctx, user._id);

  if (existing) {
    await ctx.db.patch(existing._id, {
      encryptedApiKey: encrypted.encryptedApiKey,
      encryptionIv: encrypted.encryptionIv,
      keyLast4: trimmedKey.slice(-4),
      modelPreference: args.modelPreference?.trim() || existing.modelPreference,
      status: "untested",
      testedAt: undefined,
      updatedAt: timestamp,
    });
  } else {
    await ctx.db.insert("aiProviderCredentials", {
      userId: user._id,
      provider: AI_PROVIDER,
      label: AI_LABEL,
      encryptedApiKey: encrypted.encryptedApiKey,
      encryptionIv: encrypted.encryptionIv,
      keyLast4: trimmedKey.slice(-4),
      modelPreference: args.modelPreference?.trim() || "claude-sonnet-4-5",
      status: "untested",
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }

  return {
    saved: true,
    keyLast4: trimmedKey.slice(-4),
  };
}

export const getCredentialForUserArgs = {
  userId: v.id("users"),
};

export async function getCredentialForUserHandler(ctx: QueryCtx, args: { userId: Id<"users"> }) {
  return getCredentialRecord(ctx, args.userId);
}

export const updateCredentialStatusArgs = {
  userId: v.id("users"),
  status: v.union(v.literal("untested"), v.literal("valid"), v.literal("invalid")),
  testedAt: v.optional(v.number()),
};

export async function updateCredentialStatusHandler(
  ctx: MutationCtx,
  args: {
    userId: Id<"users">;
    status: "untested" | "valid" | "invalid";
    testedAt?: number;
  },
) {
  const credential = await getCredentialRecord(ctx, args.userId);
  if (!credential) {
    return null;
  }

  await ctx.db.patch(credential._id, {
    status: args.status,
    testedAt: args.testedAt,
    updatedAt: now(),
  });

  return credential._id;
}

export const testAnthropicKeyArgs = {
  apiKey: v.optional(v.string()),
  modelPreference: v.optional(v.string()),
};

export async function testAnthropicKeyHandler(
  ctx: ActionCtx,
  args: { apiKey?: string; modelPreference?: string },
): Promise<{
  valid: true;
  modelCount: number;
  modelPreference: string;
}> {
  const viewer: { userId: Id<"users"> } = await ctx.runQuery(internal.onboarding.getViewerContext, {});
  const credential: Doc<"aiProviderCredentials"> | null = await ctx.runQuery(
    internal.aiCredentials.getCredentialForUser,
    { userId: viewer.userId },
  );

  const candidateKey = args.apiKey?.trim()
    ? args.apiKey.trim()
    : credential
      ? await decryptApiKey(credential.encryptedApiKey, credential.encryptionIv)
      : null;

  if (!candidateKey) {
    throw new Error("Save an Anthropic API key before testing it.");
  }

  const response = await fetch("https://api.anthropic.com/v1/models", {
    method: "GET",
    headers: {
      "x-api-key": candidateKey,
      "anthropic-version": ANTHROPIC_VERSION,
    },
  });

  if (!response.ok) {
    await ctx.runMutation(internal.aiCredentials.updateCredentialStatus, {
      userId: viewer.userId,
      status: "invalid",
      testedAt: now(),
    });

    if (response.status === 401 || response.status === 403) {
      throw new Error("Anthropic rejected this API key.");
    }

    throw new Error("Anthropic could not validate this API key right now.");
  }

  const payload = (await response.json()) as { data?: Array<{ id: string }> };
  await ctx.runMutation(internal.aiCredentials.updateCredentialStatus, {
    userId: viewer.userId,
    status: "valid",
    testedAt: now(),
  });

  return {
    valid: true,
    modelCount: payload.data?.length ?? 0,
    modelPreference: args.modelPreference?.trim() || credential?.modelPreference || "claude-sonnet-4-5",
  };
}
