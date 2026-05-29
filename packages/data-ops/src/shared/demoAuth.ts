const PRODUCTION_HOSTNAMES = new Set(["getstage.co", "www.getstage.co"]);

export function isProductionHostname(hostname: string) {
  return PRODUCTION_HOSTNAMES.has(hostname.trim().toLowerCase());
}

export function isDemoAuthEnabledForHostname(hostname: string | null | undefined) {
  if (!hostname) {
    return true;
  }

  return !isProductionHostname(hostname);
}

export function getHostnameFromUrl(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).hostname;
  } catch {
    return null;
  }
}
