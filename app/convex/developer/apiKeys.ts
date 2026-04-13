import { v } from "convex/values";
import { mutation, query, internalQuery, internalMutation } from "../_generated/server";
import { requireAuthUser } from "../_helpers";
import { getCurrentSubscriptionSnapshot } from "../billing";

const KEY_PREFIX = "stg_";
const KEY_BYTE_LENGTH = 32;
const MAX_KEYS_PER_USER = 5;

async function hashKey(rawKey: string): Promise<string> {
  const encoded = new TextEncoder().encode(rawKey);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  const hashArray = new Uint8Array(hashBuffer);
  return Array.from(hashArray)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function generateRawKey(): string {
  const bytes = new Uint8Array(KEY_BYTE_LENGTH);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${KEY_PREFIX}${hex}`;
}

// --- Session-authed functions (for the Settings UI) ---

export const generate = mutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);
    const trimmedName = args.name.trim();
    const subscription = await getCurrentSubscriptionSnapshot(ctx, String(user._id));
    const plan = subscription?.plan ?? user.plan ?? "free";

    if (plan !== "pro") {
      throw new Error("API keys require Stage Pro.");
    }

    if (!trimmedName || trimmedName.length > 64) {
      throw new Error("Key name must be between 1 and 64 characters.");
    }

    const existingKeys = await ctx.db
      .query("apiKeys")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const activeKeys = existingKeys.filter((k) => !k.revokedAt);
    if (activeKeys.length >= MAX_KEYS_PER_USER) {
      throw new Error(`You can have at most ${MAX_KEYS_PER_USER} active API keys.`);
    }

    const rawKey = generateRawKey();
    const hashedKey = await hashKey(rawKey);

    await ctx.db.insert("apiKeys", {
      userId: user._id,
      hashedKey,
      name: trimmedName,
      createdAt: Date.now(),
    });

    // Return the raw key — shown once, never stored.
    return { key: rawKey };
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuthUser(ctx);

    const keys = await ctx.db
      .query("apiKeys")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    return keys.map((k) => ({
      id: k._id,
      name: k.name,
      createdAt: k.createdAt,
      lastUsedAt: k.lastUsedAt,
      isRevoked: !!k.revokedAt,
    }));
  },
});

export const revoke = mutation({
  args: {
    keyId: v.id("apiKeys"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);
    const key = await ctx.db.get(args.keyId);

    if (!key) {
      throw new Error("API key not found.");
    }

    if (key.userId !== user._id) {
      throw new Error("Not authorized.");
    }

    if (key.revokedAt) {
      throw new Error("API key is already revoked.");
    }

    await ctx.db.patch(args.keyId, { revokedAt: Date.now() });
  },
});

// --- Internal functions (for API auth in HTTP actions) ---

export const getUserByHashedKey = internalQuery({
  args: {
    hashedKey: v.string(),
  },
  handler: async (ctx, args) => {
    const apiKey = await ctx.db
      .query("apiKeys")
      .withIndex("by_hashed_key", (q) => q.eq("hashedKey", args.hashedKey))
      .unique();

    if (!apiKey || apiKey.revokedAt) {
      return null;
    }

    const user = await ctx.db.get(apiKey.userId);
    if (!user) {
      return null;
    }

    const subscription = await getCurrentSubscriptionSnapshot(ctx, String(user._id));
    const plan = subscription?.plan ?? user.plan ?? "free";
    if (plan !== "pro") {
      return null;
    }

    return { apiKeyId: apiKey._id, userId: user._id };
  },
});

export const authenticateByHashedKey = internalMutation({
  args: {
    hashedKey: v.string(),
  },
  handler: async (ctx, args) => {
    const apiKey = await ctx.db
      .query("apiKeys")
      .withIndex("by_hashed_key", (q) => q.eq("hashedKey", args.hashedKey))
      .unique();

    if (!apiKey || apiKey.revokedAt) {
      return null;
    }

    const user = await ctx.db.get(apiKey.userId);
    if (!user) {
      return null;
    }

    const subscription = await getCurrentSubscriptionSnapshot(ctx, String(user._id));
    const plan = subscription?.plan ?? user.plan ?? "free";
    if (plan !== "pro") {
      return null;
    }

    await ctx.db.patch(apiKey._id, {
      lastUsedAt: Date.now(),
    });

    return { apiKeyId: apiKey._id, userId: user._id };
  },
});

export const touchLastUsed = internalMutation({
  args: {
    keyId: v.id("apiKeys"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.keyId, { lastUsedAt: Date.now() });
  },
});
