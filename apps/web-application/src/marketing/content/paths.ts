// Where each content type is served.
export const pagePath = (slug: string) => `/${slug}`;
export const useCasePath = (slug: string) => `/use-cases/${slug}`;
export const blogPostPath = (slug: string) => `/blog/${slug}`;

// First path segments the web app already uses; a content page cannot take them.
export const RESERVED_PAGE_SLUGS = new Set([
  "marketplace", "component-libraries", "skills", "tools", "profile", "builders",
  "agents",
  "api",
  "auth",
  "billing",
  "blog",
  "dashboard",
  "docs",
  "download",
  "help",
  "integrations",
  "invite",
  "landing-preview",
  "new-project",
  "open",
  "openclaw",
  "portal",
  "privacy",
  "project",
  "settings",
  "stripe",
  "terms",
  "use-cases",
]);
