// Fixed public paths of the web app (no auth, no redirect to the landing page).
// A leaf module so the route policy and the content checks can share it.
export const PUBLIC_WEB_PATHS: ReadonlySet<string> = new Set([
  "/",
  "/auth",
  "/auth/desktop",
  "/billing/return",
  "/download",
  "/download/mac",
  "/open",
  "/terms",
  "/privacy",
  "/use-cases",
  "/blog",
  "/marketplace",
  "/component-libraries",
  "/skills",
  "/tools",
  "/profile",
]);
