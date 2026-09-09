import { v } from "convex/values";

/** Keep in sync with user-application `canonicalGithubRepoUrl` / `skillHubIdSchema`. */
const SKILL_HUB_ID_PATTERN = /^[a-z][a-z0-9-]{0,62}$/;
const GITHUB_RESERVED_OWNERS = new Set([
  "about",
  "enterprise",
  "explore",
  "features",
  "login",
  "logout",
  "marketplace",
  "new",
  "notifications",
  "orgs",
  "pricing",
  "settings",
  "signup",
  "topics",
]);
const GITHUB_REPO_NAME = /^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/i;

export const importedSkillHubItemValidator = v.object({
  id: v.string(),
  kind: v.union(v.literal("skill"), v.literal("component")),
  name: v.string(),
  sourceUrl: v.string(),
});

export function parseCanonicalGithubRepo(value: string): {
  href: string;
  owner: string;
  repo: string;
} {
  const trimmed = value.trim();
  if (trimmed.length < 8 || trimmed.length > 2048) {
    throw new Error("URL length is invalid.");
  }
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error("Invalid URL.");
  }
  if (url.protocol !== "https:") {
    throw new Error("Only HTTPS URLs are allowed.");
  }
  if (url.username || url.password) {
    throw new Error("URLs with credentials are not allowed.");
  }
  const haystack = `${url.search} ${url.hash}`.toLowerCase();
  if (
    haystack.includes("token=") ||
    haystack.includes("access_token=") ||
    haystack.includes("secret=") ||
    haystack.includes("api_key=")
  ) {
    throw new Error("URLs with secrets in the query or hash are not allowed.");
  }
  const host = url.hostname.toLowerCase();
  if (host !== "github.com" && host !== "www.github.com") {
    throw new Error("Only github.com URLs are allowed.");
  }
  const parts = url.pathname.split("/").filter(Boolean);
  const owner = parts[0]?.toLowerCase();
  const repo = parts[1]?.replace(/\.git$/i, "").toLowerCase();
  if (!owner || !repo || GITHUB_RESERVED_OWNERS.has(owner) || !GITHUB_REPO_NAME.test(repo)) {
    throw new Error("GitHub URL must point at a repository.");
  }
  return {
    href: `https://github.com/${owner}/${repo}`,
    owner,
    repo,
  };
}

export function deriveImportedSkillHubId(owner: string, repo: string): string {
  const raw = `gh-${owner}-${repo}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  const id = /^[a-z]/.test(raw) ? raw : `g${raw}`.slice(0, 64);
  if (!SKILL_HUB_ID_PATTERN.test(id)) {
    throw new Error("Could not derive a valid skill id from this repository.");
  }
  return id;
}

export function assertImportedSkillHubItems(
  items: Array<{ id: string; kind: "skill" | "component"; name: string; sourceUrl: string }>,
) {
  if (items.length > 32) {
    throw new Error("importedSkillHubItems exceeds 32 entries.");
  }
  const seenIds = new Set<string>();
  const seenUrls = new Set<string>();
  for (const item of items) {
    const name = item.name.trim();
    if (name.length === 0 || name.length > 80) {
      throw new Error("Imported item name is invalid.");
    }
    const parsed = parseCanonicalGithubRepo(item.sourceUrl);
    const expectedId = deriveImportedSkillHubId(parsed.owner, parsed.repo);
    if (item.id !== expectedId) {
      throw new Error("Imported item id does not match its GitHub URL.");
    }
    if (seenIds.has(item.id) || seenUrls.has(parsed.href)) {
      throw new Error("Duplicate imported skill or library.");
    }
    seenIds.add(item.id);
    seenUrls.add(parsed.href);
    item.name = name;
    item.sourceUrl = parsed.href;
  }
}
