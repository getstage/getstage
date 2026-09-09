import assert from "node:assert/strict";
import test from "node:test";
import {
  initialPickerSelection,
  sanitizeCatalogIds,
  sanitizeProjectCatalogSelection,
} from "./skillHubIds";

test("sanitizeCatalogIds keeps kebab catalog ids and drops junk", () => {
  assert.deepEqual(
    sanitizeCatalogIds(
      ["design-taste-frontend", "../etc/passwd", "Design Taste", "design-taste-frontend"],
      ["design-taste-frontend", "frontend-design"],
    ),
    ["design-taste-frontend"],
  );
});

test("sanitizeProjectCatalogSelection drops unknown catalog ids", () => {
  const next = sanitizeProjectCatalogSelection(
    ["design-taste-frontend", "not-a-skill"],
    ["shadcn-ui", "javascript:alert"],
  );
  assert.deepEqual(next.skillIds, ["design-taste-frontend"]);
  assert.deepEqual(next.componentPackIds, ["shadcn-ui"]);
});

test("sanitizeProjectCatalogSelection keeps extra imported ids", () => {
  const next = sanitizeProjectCatalogSelection(
    ["design-taste-frontend", "gh-owner-custom-skill"],
    ["shadcn-ui", "gh-owner-custom-pack"],
    {
      skillIds: ["gh-owner-custom-skill"],
      packIds: ["gh-owner-custom-pack"],
    },
  );
  assert.deepEqual(next.skillIds, ["design-taste-frontend", "gh-owner-custom-skill"]);
  assert.deepEqual(next.componentPackIds, ["shadcn-ui", "gh-owner-custom-pack"]);
});

test("initialPickerSelection prefers stored installed ids, else defaults that are installed", () => {
  assert.deepEqual(
    initialPickerSelection({
      skillIds: ["frontend-design"],
      componentPackIds: ["magic-ui"],
      installedSkillIds: ["design-taste-frontend", "frontend-design"],
      enabledComponentPackIds: ["shadcn-ui", "magic-ui"],
    }),
    { skillIds: ["frontend-design"], componentPackIds: ["magic-ui"] },
  );

  assert.deepEqual(
    initialPickerSelection({
      skillIds: [],
      componentPackIds: [],
      installedSkillIds: ["design-taste-frontend"],
      enabledComponentPackIds: ["shadcn-ui"],
    }),
    { skillIds: ["design-taste-frontend"], componentPackIds: ["shadcn-ui"] },
  );
});
