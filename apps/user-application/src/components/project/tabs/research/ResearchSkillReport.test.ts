import assert from "node:assert/strict";
import test from "node:test";
import { cleanSkillMarkdown, skillReportSummary } from "./ResearchSkillReport";

const echoed = '{"apiVersion":"v1","artifactKind":"researchArtifact","summary":["x"]}';

test("a saved report never shows Stage's own artifact JSON", () => {
  const markdown = cleanSkillMarkdown(`## Summary\n- One clear path.\n- Early previews.\n${echoed}`);
  assert.doesNotMatch(markdown, /artifactKind/);
  assert.deepEqual(skillReportSummary(markdown), ["One clear path.", "Early previews."]);
});
