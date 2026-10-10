import { createRemoteJWKSet, jwtVerify } from "jose";

const keySets = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

export function authOrigin(value: string | undefined): string | undefined {
  try {
    const url = new URL(value ?? "");
    if (url.protocol !== "https:" || !url.hostname.endsWith(".convex.site")
      || url.username || url.password || url.search || url.hash || url.pathname !== "/") return;
    return url.origin;
  } catch { return; }
}

export async function verifySession(token: string, issuer: string): Promise<string> {
  let keys = keySets.get(issuer);
  if (!keys) {
    keys = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`), {
      timeoutDuration: 3000, cooldownDuration: 30_000, cacheMaxAge: 600_000,
    });
    if (keySets.size >= 2) keySets.clear();
    keySets.set(issuer, keys);
  }
  const { payload } = await jwtVerify(token, keys, {
    algorithms: ["RS256"], issuer, audience: "convex", requiredClaims: ["sub", "iat", "exp"],
    clockTolerance: 5,
  });
  // Convex Auth signs userId|authSessionId, not an email or an app-launch session id.
  const match = /^([a-z0-9]{16,64})\|[a-z0-9]{16,64}$/.exec(payload.sub ?? "");
  if (!match?.[1]) throw new Error("Invalid Stage subject.");
  return match[1];
}
