import assert from "node:assert/strict";
import test from "node:test";
import {
  parseGithubSourceUrl,
  parsePublicHttpsUrl,
  skillHubIdSchema,
} from "../../../shared/models/safeHttpsUrl";
import { COMPONENT_PACK_CATALOG, DISCOVER_SKILL_CATALOG } from "./skillsCatalog";

test("every catalog skill id and GitHub sourceUrl is import-safe", () => {
  for (const skill of DISCOVER_SKILL_CATALOG) {
    assert.equal(skillHubIdSchema.parse(skill.id), skill.id);
    parseGithubSourceUrl(skill.sourceUrl);
  }
});

test("every catalog pack sourceUrl is a public HTTPS URL when present", () => {
  for (const pack of COMPONENT_PACK_CATALOG) {
    assert.equal(skillHubIdSchema.parse(pack.id), pack.id);
    if (pack.sourceUrl) parsePublicHttpsUrl(pack.sourceUrl);
  }
});
