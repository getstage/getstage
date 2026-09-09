import assert from "node:assert/strict";
import test from "node:test";
import {
  canonicalGithubRepoUrl,
  deriveImportedSkillHubId,
  parseGithubSourceUrl,
  parsePublicHttpsUrl,
  skillHubIdSchema,
} from "./safeHttpsUrl";

test("canonicalGithubRepoUrl strips tree paths to owner/repo", () => {
  assert.deepEqual(
    canonicalGithubRepoUrl(
      "https://github.com/anthropics/skills/tree/main/skills/frontend-design",
    ),
    {
      href: "https://github.com/anthropics/skills",
      owner: "anthropics",
      repo: "skills",
    },
  );
});

test("deriveImportedSkillHubId is kebab and stable", () => {
  assert.equal(
    deriveImportedSkillHubId("Leonxlnx", "taste-skill"),
    "gh-leonxlnx-taste-skill",
  );
});

test("parsePublicHttpsUrl accepts ordinary https hosts", () => {
  assert.equal(
    parsePublicHttpsUrl("https://ui.shadcn.com/docs"),
    "https://ui.shadcn.com/docs",
  );
});

test("parsePublicHttpsUrl rejects credentials, localhost, and http", () => {
  assert.throws(() => parsePublicHttpsUrl("http://github.com/owner/repo"), /HTTPS/);
  assert.throws(
    () => parsePublicHttpsUrl("https://user:pass@github.com/owner/repo"),
    /credentials/,
  );
  assert.throws(() => parsePublicHttpsUrl("https://localhost/secret"), /private/);
  assert.throws(() => parsePublicHttpsUrl("https://127.0.0.1/secret"), /private/);
  assert.throws(() => parsePublicHttpsUrl("https://192.168.1.9/secret"), /private/);
  assert.throws(
    () => parsePublicHttpsUrl("https://github.com/owner/repo?token=abc"),
    /secrets/,
  );
  assert.throws(() => parsePublicHttpsUrl("javascript:alert(1)"), /HTTPS|Invalid/);
});

test("parseGithubSourceUrl accepts repo and tree URLs", () => {
  assert.equal(
    parseGithubSourceUrl("https://github.com/Leonxlnx/taste-skill"),
    "https://github.com/Leonxlnx/taste-skill",
  );
  assert.match(
    parseGithubSourceUrl(
      "https://github.com/anthropics/skills/tree/main/skills/frontend-design",
    ),
    /anthropics\/skills/,
  );
});

test("parseGithubSourceUrl rejects non-github and non-repo paths", () => {
  assert.throws(() => parseGithubSourceUrl("https://gitlab.com/owner/repo"), /github\.com/);
  assert.throws(() => parseGithubSourceUrl("https://github.com.evil.com/owner/repo"), /github\.com/);
  assert.throws(() => parseGithubSourceUrl("https://github.com/login"), /owner and repository/);
  assert.throws(() => parseGithubSourceUrl("https://github.com/settings/tokens"), /repository/);
});

test("skillHubIdSchema accepts kebab-case catalog ids", () => {
  assert.equal(skillHubIdSchema.parse("design-taste-frontend"), "design-taste-frontend");
  assert.throws(() => skillHubIdSchema.parse("Design Taste"), /kebab-case/);
  assert.throws(() => skillHubIdSchema.parse("../etc/passwd"), /kebab-case/);
  assert.throws(() => skillHubIdSchema.parse("a".repeat(80)), /kebab-case/);
});
