import { internal } from "../_generated/api";
import { enforceApiRequestRateLimit } from "../platform/rateLimits";
import { ApiError } from "./errors";
import type { ApiAuthContext, ApiContext } from "./types";

function getBearerToken(authorizationHeader: string | undefined) {
  if (!authorizationHeader) {
    throw new ApiError(401, "Missing Authorization header.", "missing_authorization");
  }

  const [scheme, token] = authorizationHeader.trim().split(/\s+/, 2);
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    throw new ApiError(401, "Authorization header must use Bearer auth.", "invalid_authorization");
  }

  return token;
}

async function hashApiKey(rawKey: string) {
  const encoded = new TextEncoder().encode(rawKey);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  const hashArray = new Uint8Array(hashBuffer);

  return Array.from(hashArray)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function asRateLimitMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (!message.includes("Too many API requests") && !message.includes("rate limit")) {
    return null;
  }
  return message;
}

export async function authenticateApiKey(c: ApiContext): Promise<ApiAuthContext> {
  const rawKey = getBearerToken(c.req.header("authorization"));
  const hashedKey = await hashApiKey(rawKey);
  const auth = await c.env.runMutation(internal.developer.apiKeys.authenticateByHashedKey, {
    hashedKey,
  });

  if (!auth) {
    throw new ApiError(401, "Invalid API key.", "invalid_api_key");
  }

  try {
    await enforceApiRequestRateLimit(c.env, String(auth.apiKeyId));
  } catch (error) {
    const message = asRateLimitMessage(error);
    if (message) {
      throw new ApiError(429, message, "rate_limited");
    }
    throw error;
  }

  return auth;
}
