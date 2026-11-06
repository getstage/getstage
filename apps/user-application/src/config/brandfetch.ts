const CLIENT_ID = import.meta.env.VITE_BRANDFETCH_CLIENT_ID;

export function brandLogoUrl(domain: string, sizePx: number): string | null {
  if (!CLIENT_ID) return null;
  return `https://cdn.brandfetch.io/${domain}/w/${sizePx}/h/${sizePx}?c=${CLIENT_ID}`;
}
