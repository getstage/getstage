const PUBLIC_WEB_PATHS = new Set([
  "/",
  "/auth",
  "/auth/desktop",
  "/billing/return",
  "/download/mac",
  "/open",
  "/terms",
  "/privacy",
]);

const PRODUCT_WORKSPACE_PREFIXES = ["/dashboard", "/new-project", "/settings", "/project/"];

export function isPublicWebPath(pathname: string) {
  if (PUBLIC_WEB_PATHS.has(pathname)) {
    return true;
  }

  return pathname.startsWith("/portal/");
}

export function isProductWorkspacePath(pathname: string) {
  return PRODUCT_WORKSPACE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix),
  );
}

export function getWebRouteLockRedirect(pathname: string) {
  if (isPublicWebPath(pathname)) {
    return null;
  }

  if (isProductWorkspacePath(pathname)) {
    return "/download/mac" as const;
  }

  return "/" as const;
}

// Legacy Stripe success/cancel URLs point at /dashboard?billing=* (web checkout).
// The web app locks /dashboard → /download/mac, which traps desktop users after
// external-browser checkout. Send them to the public billing return page instead.
export function getLegacyBillingReturnRedirect(
  pathname: string,
  search: Record<string, unknown>,
): "success" | "cancel" | null {
  if (pathname !== "/dashboard") {
    return null;
  }
  if (search.billing === "success" || search.billing === "cancel") {
    return search.billing;
  }
  return null;
}
