// Resolves a pasted GitHub link to the exact SKILL.md the engine should download.
// Skill repos often keep SKILL.md in a subfolder (e.g. skills/<name>/SKILL.md), so the
// repository tree is searched; a file without a name/description header is rejected
// because it is not an agent skill.

export type ResolvedSkill = { url: string; name: string; description: string };

type Fetch = (url: string) => Promise<{ ok: boolean; status: number; json(): Promise<unknown>; text(): Promise<string> }>;

const SEGMENT = /^[A-Za-z0-9._-]+$/;
const MAX_SKILL_CHARS = 100 * 1024;

function parseLink(value: string) {
  const withScheme = /^https?:\/\//i.test(value.trim()) ? value.trim() : `https://${value.trim()}`;
  const url = new URL(withScheme);
  if (url.protocol !== "https:" || !/^(www\.)?github\.com$/i.test(url.hostname)) return null;
  const [owner, rawRepo, kind, ref, ...rest] = url.pathname.split("/").filter(Boolean);
  const repo = rawRepo?.replace(/\.git$/, "");
  if (!owner || !repo || !SEGMENT.test(owner) || !SEGMENT.test(repo)) return null;
  if (kind && kind !== "tree" && kind !== "blob") return null;
  const path = rest.join("/");
  if ([ref, ...rest].some((segment) => segment !== undefined && (!SEGMENT.test(segment) || segment === ".."))) return null;
  return { owner, repo, ref: kind ? ref : "HEAD", path };
}

function frontmatter(content: string) {
  const block = content.replace(/^﻿/, "").match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? "";
  const field = (key: string) =>
    block.match(new RegExp(`^${key}:\\s*(.+)$`, "m"))?.[1].trim().replace(/^["']|["']$/g, "") ?? "";
  return { name: field("name"), description: field("description") };
}

// Picks the skill a repository link most likely means: the one in the linked folder,
// else the only one, else the one named like the repository.
function pickSkillFile(paths: string[], folder: string, repo: string): string | { choices: string[] } | null {
  const prefix = folder ? `${folder.replace(/\/$/, "")}/` : "";
  const skills = paths.filter((path) => path.startsWith(prefix) && /(^|\/)skill\.md$/i.test(path));
  const direct = skills.find((path) => path.toLowerCase() === `${prefix}skill.md`);
  if (direct) return direct;
  if (skills.length === 1) return skills[0];
  const named = skills.filter((path) => path.split("/").at(-2)?.toLowerCase() === repo.toLowerCase());
  if (named.length === 1) return named[0];
  return skills.length > 0 ? { choices: skills.map((path) => path.replace(/\/skill\.md$/i, "")) } : null;
}

export async function resolveSkillUrl(value: string, fetcher: Fetch = fetch): Promise<ResolvedSkill> {
  const link = parseLink(value);
  if (!link) throw new Error("Paste a public GitHub repository link, e.g. github.com/owner/repo");
  const { owner, repo, ref, path } = link;

  let file = path;
  if (!/\.md$/i.test(path)) {
    const tree = await fetcher(`https://api.github.com/repos/${owner}/${repo}/git/trees/${ref}?recursive=1`);
    if (tree.status === 404) throw new Error("This repository is private or doesn't exist.");
    if (!tree.ok) throw new Error("GitHub didn't answer. Try again in a minute.");
    const entries = ((await tree.json()) as { tree?: Array<{ path: string; type: string }> }).tree ?? [];
    const picked = pickSkillFile(entries.filter((entry) => entry.type === "blob").map((entry) => entry.path), path, repo);
    if (!picked) throw new Error("No SKILL.md in this repository, so it isn't an agent skill.");
    if (typeof picked !== "string") {
      const shown = picked.choices.slice(0, 4).join(", ");
      throw new Error(`This repository has ${picked.choices.length} skills (${shown}${picked.choices.length > 4 ? ", …" : ""}). Paste the link to the folder of the one you want.`);
    }
    file = picked;
  }

  const raw = await fetcher(`https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${file}`);
  if (!raw.ok) throw new Error("Couldn't download this SKILL.md from GitHub.");
  const content = await raw.text();
  if (content.length > MAX_SKILL_CHARS) throw new Error("This SKILL.md is larger than 100 KB.");
  const { name, description } = frontmatter(content);
  if (!name || !description) {
    throw new Error("This SKILL.md has no name and description header, so it doesn't look like an agent skill.");
  }
  return { url: `https://github.com/${owner}/${repo}/blob/${ref}/${file}`, name, description };
}
