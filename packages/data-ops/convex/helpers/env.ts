export function getEnv(name: string) {
  return (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.[
    name
  ];
}

export function requireEnv(name: string) {
  const value = getEnv(name);
  if (!value) {
    throw new Error(`${name} is not configured.`);
  }
  return value;
}

export function getSiteUrl() {
  return (getEnv("SITE_URL") ?? getEnv("CONVEX_SITE_URL") ?? "").replace(/\/$/, "");
}

export function requireSiteUrl() {
  const value = getSiteUrl();
  if (!value) {
    throw new Error("SITE_URL or CONVEX_SITE_URL must be configured.");
  }
  return value;
}
