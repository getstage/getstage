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
  "/mcp",
  "/use-cases",
  "/blog",
  "/marketplace",
  "/component-libraries",
  "/skills",
  "/tools",
  "/profile",
  "/setup-profile",
  // STA-63: "Choose how to use Stage" after sign-up; sends signed-out visitors to /auth.
  "/start",
  // MCP: the web app (/app and every page under it, see webRoutePolicy) and the "Allow your AI tool" page; both send signed-out visitors to /auth.
  "/app",
  "/connect-ai",
]);
