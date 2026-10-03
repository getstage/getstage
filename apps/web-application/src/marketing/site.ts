// Canonical origin for every public page, share preview, sitemap and schema.org
// entry. getstage.co is the only production marketing domain.
export const SITE_URL = "https://getstage.co";
export const SITE_NAME = "Stage";
export const DEFAULT_OG_IMAGE = "/og-image.png";
export const TRIAL_CTA = { label: "Try free for macOS", href: "/download" } as const;

export function absoluteUrl(path: string) {
  return new URL(path, SITE_URL).toString();
}
