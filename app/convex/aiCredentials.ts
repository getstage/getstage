import { v } from "convex/values";
import { action, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireAuthUser } from "./_helpers";
import type { Doc, Id } from "./_generated/dataModel";

const AI_PROVIDER = "anthropic";
const AI_LABEL = "claude";
const ANTHROPIC_VERSION = "2023-06-01";
const internalApi = internal as any;

function now() {
  return Date.now();
}

function getEnv(name: string) {
  return (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.[
    name
  ];
}

function requireSecret() {
  const secret = getEnv("ANTHROPIC_CREDENTIALS_SECRET");
  if (!secret) {
    throw new Error("Missing ANTHROPIC_CREDENTIALS_SECRET.");
  }
  return secret;
}

function toBase64(value: ArrayBuffer | Uint8Array) {
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function fromBase64(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function getEncryptionKey(secret: string) {
  const encoded = new TextEncoder().encode(secret);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}

async function encryptApiKey(rawApiKey: string) {
  const key = await getEncryptionKey(requireSecret());
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(rawApiKey);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);

  return {
    encryptedApiKey: toBase64(ciphertext),
    encryptionIv: toBase64(iv),
  };
}

async function decryptApiKey(encryptedApiKey: string, encryptionIv: string) {
  const key = await getEncryptionKey(requireSecret());
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64(encryptionIv) },
    key,
    fromBase64(encryptedApiKey),
  );

  return new TextDecoder().decode(plaintext);
}

async function getCredentialRecord(
  ctx: any,
  userId: Id<"users">,
) {
  return ctx.db
    .query("aiProviderCredentials")
    .withIndex("by_user_provider", (q: any) => q.eq("userId", userId).eq("provider", AI_PROVIDER))
    .unique();
}

export const getAnthropicCredentialSummary = query({
  args: {},
  handler: async (ctx) => {
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
  },
});

export const saveAnthropicKey = mutation({
  args: {
    apiKey: v.string(),
    modelPreference: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
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
  },
});

export const getCredentialForUser = internalQuery({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return getCredentialRecord(ctx, args.userId);
  },
});

export const updateCredentialStatus = internalMutation({
  args: {
    userId: v.id("users"),
    status: v.union(v.literal("untested"), v.literal("valid"), v.literal("invalid")),
    testedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
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
  },
});

export const testAnthropicKey = action({
  args: {
    apiKey: v.optional(v.string()),
    modelPreference: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    valid: true;
    modelCount: number;
    modelPreference: string;
  }> => {
    const viewer: { userId: Id<"users"> } = await ctx.runQuery(internal.onboarding.getViewerContext, {});
    const credential: Doc<"aiProviderCredentials"> | null = await ctx.runQuery(
      internalApi.aiCredentials.getCredentialForUser,
      {
      userId: viewer.userId,
      },
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
      await ctx.runMutation(internalApi.aiCredentials.updateCredentialStatus, {
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
    await ctx.runMutation(internalApi.aiCredentials.updateCredentialStatus, {
      userId: viewer.userId,
      status: "valid",
      testedAt: now(),
    });

    return {
      valid: true,
      modelCount: payload.data?.length ?? 0,
      modelPreference:
        args.modelPreference?.trim() || credential?.modelPreference || "claude-sonnet-4-5",
    };
  },
});
