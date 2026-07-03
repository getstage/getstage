import { app } from "electron";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@stage/data-ops/convex/api";

const CACHE_TTL_MS = 5 * 60 * 1000;

type CachedSecret = {
  value: string | null;
  expiresAt: number;
};

const secretCache = new Map<string, CachedSecret>();

function readTrimmedEnv(name: string): string | null {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : null;
}

function getConvexDeploymentUrl(): string | null {
  return readTrimmedEnv("VITE_CONVEX_URL") ?? readTrimmedEnv("CONVEX_URL");
}

function readLocalDevOpenRouterKey(): string | null {
  if (app.isPackaged) {
    return null;
  }

  return (
    readTrimmedEnv("OPENROUTER_API_KEY") ??
    readTrimmedEnv("openrouter_api_key") ??
    readTrimmedEnv("STAGE_OPENROUTER_API_KEY")
  );
}

function readCachedSecret(cacheKey: string): string | null | undefined {
  const cached = secretCache.get(cacheKey);
  if (!cached) {
    return undefined;
  }

  if (cached.expiresAt <= Date.now()) {
    secretCache.delete(cacheKey);
    return undefined;
  }

  return cached.value;
}

function writeCachedSecret(cacheKey: string, value: string | null) {
  secretCache.set(cacheKey, {
    value,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

async function queryConvexSecret<T extends { token?: string | null; apiKey?: string | null }>(
  accessToken: string,
  queryRef: typeof api.appSecrets.getReferoMcpToken | typeof api.appSecrets.getOpenRouterApiKey,
  cacheKey: string,
): Promise<string | null> {
  const cached = readCachedSecret(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  const deploymentUrl = getConvexDeploymentUrl();
  if (!deploymentUrl) {
    return null;
  }

  const client = new ConvexHttpClient(deploymentUrl);
  client.setAuth(accessToken);

  try {
    const result = (await client.query(queryRef, {})) as T;
    const value = (result.token ?? result.apiKey ?? null)?.trim() || null;
    writeCachedSecret(cacheKey, value);
    return value;
  } finally {
    client.clearAuth();
  }
}

export async function resolveOpenRouterApiKey(accessToken: string | null): Promise<string | null> {
  const localKey = readLocalDevOpenRouterKey();
  if (localKey) {
    return localKey;
  }

  if (!accessToken?.trim()) {
    return null;
  }

  return queryConvexSecret(
    accessToken.trim(),
    api.appSecrets.getOpenRouterApiKey,
    `openrouter:${accessToken.trim()}`,
  );
}

export function clearAppSecretCache() {
  secretCache.clear();
}
