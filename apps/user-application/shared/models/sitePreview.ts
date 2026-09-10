import {
  canonicalGithubRepoUrl,
  parsePublicHttpsUrl,
  skillHubIdSchema,
} from "./safeHttpsUrl";

export type HomepagePreview = {
  name: string;
  subtitle: string;
  iconUrl: string;
  sourceUrl: string;
};

const MAX_NAME = 80;
const MAX_SUBTITLE = 160;

/** Stable id from a library homepage host: `ui.shadcn.com` → `web-ui-shadcn-com`. */
export function deriveImportedWebId(hostname: string): string {
  const raw = `web-${hostname.toLowerCase().replace(/^www\./, "")}`
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  const id = /^[a-z]/.test(raw) ? raw : `w${raw}`.slice(0, 64);
  return skillHubIdSchema.parse(id);
}

/** `ui.aceternity.com` and `aceternity.com` share this key. GitHub is owner/repo, never all of github.com. */
export function sourceFingerprint(value: string): string | null {
  try {
    const github = canonicalGithubRepoUrl(value);
    return `gh:${github.owner}/${github.repo}`;
  } catch {
    try {
      const host = new URL(parsePublicHttpsUrl(value)).hostname
        .toLowerCase()
        .replace(/^www\./, "");
      const parts = host.split(".").filter(Boolean);
      const domain = parts.length <= 2 ? host : parts.slice(-2).join(".");
      return `web:${domain}`;
    } catch {
      return null;
    }
  }
}

export function existingSourceName(
  url: string,
  entries: readonly { name: string; sourceUrl?: string }[],
): string | null {
  const key = sourceFingerprint(url);
  if (!key) return null;
  for (const entry of entries) {
    if (!entry.sourceUrl) continue;
    if (sourceFingerprint(entry.sourceUrl) === key) return entry.name;
  }
  return null;
}

export function fallbackPreviewFromUrl(pageUrl: string): HomepagePreview {
  const url = new URL(parsePublicHttpsUrl(pageUrl));
  const host = url.hostname.replace(/^www\./, "");
  return {
    name: clip(host, MAX_NAME),
    subtitle: "",
    iconUrl: `https://${host}/favicon.ico`,
    sourceUrl: `https://${host}`,
  };
}

/** Best-effort title, description, and icon URL from a library homepage. */
export function parseHomepagePreview(html: string, pageUrl: string): HomepagePreview {
  const fallback = fallbackPreviewFromUrl(pageUrl);
  const title = firstText(metaContent(html, "og:title"), tagText(html, "title"));
  const subtitle = firstText(
    metaContent(html, "og:description"),
    metaContent(html, "description"),
  );
  return {
    name: clip(title || fallback.name, MAX_NAME),
    subtitle: clip(subtitle, MAX_SUBTITLE),
    iconUrl: pickIconUrl(html, pageUrl) ?? fallback.iconUrl,
    sourceUrl: fallback.sourceUrl,
  };
}

function pickIconUrl(html: string, pageUrl: string): string | null {
  const candidates = [
    ...linkHrefs(html, "apple-touch-icon"),
    metaContent(html, "og:image"),
    metaContent(html, "twitter:image"),
    ...linkHrefs(html, "icon"),
    ...linkHrefs(html, "shortcut icon"),
    "/favicon.ico",
  ];
  for (const candidate of candidates) {
    if (!candidate) continue;
    const resolved = resolvePublicHttps(candidate, pageUrl);
    if (resolved) return resolved;
  }
  return null;
}

function resolvePublicHttps(href: string, pageUrl: string): string | null {
  const trimmed = href.trim();
  if (!trimmed || trimmed.startsWith("data:") || trimmed.startsWith("javascript:")) {
    return null;
  }
  try {
    return parsePublicHttpsUrl(new URL(trimmed, pageUrl).toString());
  } catch {
    return null;
  }
}

function metaContent(html: string, key: string): string {
  const needle = key.toLowerCase();
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const property = attr(tag, "property") || attr(tag, "name");
    if (property.toLowerCase() !== needle) continue;
    const content = attr(tag, "content");
    if (content) return decodeEntities(content);
  }
  return "";
}

function linkHrefs(html: string, rel: string): string[] {
  const needle = rel.toLowerCase();
  const tags = html.match(/<link\b[^>]*>/gi) ?? [];
  const hrefs: string[] = [];
  for (const tag of tags) {
    const relValue = attr(tag, "rel").toLowerCase();
    if (!relValue.split(/\s+/).includes(needle) && relValue !== needle) continue;
    const href = attr(tag, "href");
    if (href) hrefs.push(href);
  }
  return hrefs;
}

function tagText(html: string, tagName: string): string {
  const match = new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)</${tagName}>`, "i").exec(html);
  return match?.[1] ? decodeEntities(match[1].replace(/<[^>]+>/g, "")) : "";
}

function attr(tag: string, name: string): string {
  const match = new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i").exec(
    tag,
  );
  return match?.[2] ?? match?.[3] ?? match?.[4] ?? "";
}

function decodeEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) =>
      String.fromCodePoint(Number.parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, digits: string) => String.fromCodePoint(Number(digits)))
    .replace(/\s+/g, " ")
    .trim();
}

function firstText(...values: string[]): string {
  return values.find((value) => value.length > 0) ?? "";
}

function clip(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}
