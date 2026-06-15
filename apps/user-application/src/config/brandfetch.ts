const CLIENT_ID = import.meta.env.VITE_BRANDFETCH_CLIENT_ID;

export const brandfetchEnabled = Boolean(CLIENT_ID);

export function normalizeBrandDomain(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const host = new URL(withScheme).hostname.toLowerCase();
    return host.replace(/^www\./, "") || null;
  } catch {
    return null;
  }
}

export function brandLogoUrl(domain: string, sizePx: number): string | null {
  if (!CLIENT_ID) return null;
  return `https://cdn.brandfetch.io/${domain}/w/${sizePx}/h/${sizePx}?c=${CLIENT_ID}`;
}
