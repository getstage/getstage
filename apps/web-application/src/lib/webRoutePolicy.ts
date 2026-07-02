const PUBLIC_WEB_PATHS = new Set([
  "/",
  "/auth",
  "/auth/desktop",
  "/download/mac",
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
