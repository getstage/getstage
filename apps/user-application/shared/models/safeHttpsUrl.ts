import { z } from "zod";

/**
 * Shared allowlists for anything the desktop may open, copy, or later import.
 * Renderer and Electron main parse the same schemas so a crafted string cannot
 * skip the check by going through IPC.
 */

const MAX_URL_LENGTH = 2048;
const BLOCKED_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1", "[::1]"]);

/** Keep in sync with Convex `updateSkillHubPrefsHandler`. */
export const SKILL_HUB_ID_PATTERN = /^[a-z][a-z0-9-]{0,62}$/;

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

function isPrivateIpv4(hostname: string): boolean {
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(hostname);
  if (!match) return false;
  const octets = match.slice(1, 5).map(Number);
  if (octets.some((octet) => octet > 255)) return false;
  const [a, b] = octets;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224
  );
}

function ipv4FromMappedIpv6(address: string): string | null {
  const normalized = address.toLowerCase();
  const dotted = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/.exec(normalized);
  if (dotted?.[1]) return dotted[1];
  const hex = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(normalized);
  if (!hex?.[1] || !hex[2]) return null;
  const high = Number.parseInt(hex[1], 16);
  const low = Number.parseInt(hex[2], 16);
  if (Number.isNaN(high) || Number.isNaN(low)) return null;
  return `${(high >> 8) & 255}.${high & 255}.${(low >> 8) & 255}.${low & 255}`;
}

/** True for loopback, RFC1918, link-local, multicast, and IPv4-mapped forms of those. */
export function isPrivateIp(address: string): boolean {
  if (isPrivateIpv4(address)) return true;
  const mapped = ipv4FromMappedIpv6(address);
  if (mapped) return isPrivateIpv4(mapped);
  const normalized = address.toLowerCase();
  return (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fe80:") ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd")
  );
}

function assertNoCredentials(url: URL) {
  if (url.username || url.password) {
    throw new Error("URLs with credentials are not allowed.");
  }
}

function assertNoEmbeddedSecrets(url: URL) {
  const haystack = `${url.search} ${url.hash}`.toLowerCase();
  if (
    haystack.includes("token=") ||
    haystack.includes("access_token=") ||
    haystack.includes("secret=") ||
    haystack.includes("api_key=")
  ) {
    throw new Error("URLs with secrets in the query or hash are not allowed.");
  }
}

export function parsePublicHttpsUrl(value: unknown): string {
  if (typeof value !== "string") {
    throw new Error("URL must be a string.");
  }

  const trimmed = value.trim();
  if (trimmed.length < 8 || trimmed.length > MAX_URL_LENGTH) {
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

  assertNoCredentials(url);
  assertNoEmbeddedSecrets(url);

  const host = url.hostname.toLowerCase();
  if (
    BLOCKED_HOSTS.has(host) ||
    host.endsWith(".local") ||
    host.endsWith(".localhost") ||
    host.includes(":") ||
    isPrivateIpv4(host)
  ) {
    throw new Error("Local or private addresses are not allowed.");
  }

  return url.toString();
}

export function parseGithubSourceUrl(value: unknown): string {
  const href = parsePublicHttpsUrl(value);
  const url = new URL(href);
  const host = url.hostname.toLowerCase();
  if (host !== "github.com" && host !== "www.github.com") {
    throw new Error("Only github.com URLs are allowed.");
  }

  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length < 2) {
    throw new Error("GitHub URL must include owner and repository.");
  }

  const owner = parts[0]?.toLowerCase();
  if (!owner || GITHUB_RESERVED_OWNERS.has(owner)) {
    throw new Error("GitHub URL must point at a repository.");
  }

  return url.toString();
}

export const publicHttpsUrlSchema = z.string().transform((value, ctx) => {
  try {
    return parsePublicHttpsUrl(value);
  } catch (error) {
    ctx.addIssue({
      code: "custom",
      message: error instanceof Error ? error.message : "Invalid URL.",
    });
    return z.NEVER;
  }
});

export const githubSourceUrlSchema = z.string().transform((value, ctx) => {
  try {
    return parseGithubSourceUrl(value);
  } catch (error) {
    ctx.addIssue({
      code: "custom",
      message: error instanceof Error ? error.message : "Invalid GitHub URL.",
    });
    return z.NEVER;
  }
});

export const skillHubIdSchema = z
  .string()
  .trim()
  .regex(SKILL_HUB_ID_PATTERN, "Skill id must be lowercase kebab-case.");

export type PublicHttpsUrl = z.infer<typeof publicHttpsUrlSchema>;
export type GithubSourceUrl = z.infer<typeof githubSourceUrlSchema>;
export type SkillHubId = z.infer<typeof skillHubIdSchema>;

const GITHUB_REPO_NAME = /^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/i;

/** Canonical `https://github.com/{owner}/{repo}` — drops tree/blob/query. */
export function canonicalGithubRepoUrl(value: unknown): {
  href: string;
  owner: string;
  repo: string;
} {
  const parsed = parseGithubSourceUrl(value);
  const url = new URL(parsed);
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
  return skillHubIdSchema.parse(id);
}
