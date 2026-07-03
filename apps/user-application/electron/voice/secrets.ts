import { resolveOpenRouterApiKey as resolveFromConvex } from "../helpers/app-secrets";

export async function resolveOpenRouterApiKey(accessToken: string | null): Promise<string | null> {
  return resolveFromConvex(accessToken);
}

export async function isOpenRouterConfigured(accessToken: string | null): Promise<boolean> {
  const apiKey = await resolveOpenRouterApiKey(accessToken);
  return apiKey !== null;
}
