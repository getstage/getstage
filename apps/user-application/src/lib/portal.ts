function buildAbsoluteUrl(pathname: string) {
  if (typeof window === "undefined") {
    return pathname;
  }

  return new URL(pathname, window.location.origin).toString();
}

export function buildPortalPath(shareToken: string) {
  return `/portal/${encodeURIComponent(shareToken)}`;
}

export function rebaseUrlToCurrentOrigin(url: string) {
  if (typeof window === "undefined") {
    return url;
  }

  const parsedUrl = new URL(url, window.location.origin);
  return new URL(
    `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`,
    window.location.origin,
  ).toString();
}

export function resolvePortalShareUrl({
  shareToken,
  shareUrl,
}: {
  shareToken?: string | null;
  shareUrl?: string | null;
}) {
  if (shareToken) {
    return buildAbsoluteUrl(buildPortalPath(shareToken));
  }

  if (shareUrl) {
    return rebaseUrlToCurrentOrigin(shareUrl);
  }

  return "";
}
