import assert from "node:assert/strict";
import test from "node:test";
import { resolveSkillUrl } from "./resolveSkillUrl";

const tree = ["README.md", "skill-data/core/SKILL.md", "skill-data/slack/SKILL.md", "skills/agent-browser/SKILL.md"];
const skill = "---\nname: agent-browser\ndescription: Browser automation CLI for AI agents.\n---\n# Body";

function fakeGithub(files: Record<string, string>) {
  return async (url: string) => {
    const body = url.includes("api.github.com")
      ? JSON.stringify({ tree: tree.map((path) => ({ path, type: "blob" })) })
      : files[url.replace(/^https:\/\/raw\.githubusercontent\.com\/[^/]+\/[^/]+\/[^/]+\//, "")];
    return { ok: body !== undefined, status: body === undefined ? 404 : 200, json: async () => JSON.parse(body ?? "{}"), text: async () => body ?? "" };
  };
}

test("a repository link finds the SKILL.md named like the repository", async () => {
  const resolved = await resolveSkillUrl("https://github.com/vercel-labs/agent-browser", fakeGithub({ "skills/agent-browser/SKILL.md": skill }));
  assert.equal(resolved.url, "https://github.com/vercel-labs/agent-browser/blob/HEAD/skills/agent-browser/SKILL.md");
  assert.equal(resolved.name, "agent-browser");
});

test("a folder with several skills asks which one", async () => {
  await assert.rejects(
    resolveSkillUrl("github.com/vercel-labs/agent-browser/tree/main/skill-data", fakeGithub({})),
    /has 2 skills \(skill-data\/core, skill-data\/slack\)/,
  );
});

test("a SKILL.md without a name and description header is not accepted", async () => {
  await assert.rejects(
    resolveSkillUrl("https://github.com/acme/x/blob/main/SKILL.md", fakeGithub({ "SKILL.md": "# Just a readme" })),
    /doesn't look like an agent skill/,
  );
});

test("non-GitHub and incomplete links are rejected before any request", async () => {
  for (const url of ["https://gitlab.com/a/b", "https://github.com/a"]) {
    await assert.rejects(resolveSkillUrl(url, async () => { throw new Error("no request expected"); }), /GitHub repository link/);
  }
});
