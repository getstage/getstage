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
