import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(
  fs.readFileSync(path.join(root, "manifests", "libraries.json"), "utf8"),
);

const nonEmptyArray = (value) =>
  Array.isArray(value) && value.length > 0 && value.every((item) => typeof item === "string" && item.trim());

for (const [slot, entries] of Object.entries(manifest)) {
  for (const entry of entries) {
    test(`${slot}/${entry.id} covers every export with semantic metadata exactly once`, () => {
      assert.ok(nonEmptyArray(entry.exports), "library exports must be non-empty");
      assert.ok(nonEmptyArray(entry.componentGroups?.map((group) => group.id)));
      assert.ok(nonEmptyArray(entry.recipes?.map((recipe) => recipe.id)));

      const covered = entry.componentGroups.flatMap((group) => {
        assert.ok(group.role?.trim(), `${group.id}: role`);
        assert.ok(
          ["supporting", "structural", "signature", "decorative", "data"].includes(
            group.visualWeight,
          ),
          `${group.id}: visualWeight`,
        );
        assert.ok(nonEmptyArray(group.screenIntents), `${group.id}: screenIntents`);
        assert.ok(nonEmptyArray(group.blockIntents), `${group.id}: blockIntents`);
        assert.ok(nonEmptyArray(group.density), `${group.id}: density`);
        assert.ok(group.motion?.requirement?.trim(), `${group.id}: motion requirement`);
        assert.equal(group.runtime, "static-safe", `${group.id}: runtime`);
        assert.ok(group.requiredStaticState?.trim(), `${group.id}: requiredStaticState`);
        assert.ok(nonEmptyArray(group.avoidUse), `${group.id}: avoidUse`);
        return group.exports;
      });

      assert.equal(covered.length, new Set(covered).size, "metadata groups overlap");
      assert.deepEqual(new Set(covered), new Set(entry.exports), "metadata coverage differs from exports");

      for (const recipe of entry.recipes) {
        assert.ok(nonEmptyArray(recipe.screenIntents), `${recipe.id}: screenIntents`);
        assert.ok(nonEmptyArray(recipe.blockIntents), `${recipe.id}: blockIntents`);
        assert.ok(nonEmptyArray(recipe.density), `${recipe.id}: density`);
        assert.ok(recipe.purpose?.trim(), `${recipe.id}: purpose`);
        assert.ok(nonEmptyArray(recipe.avoidUse), `${recipe.id}: avoidUse`);
        assert.ok(Array.isArray(recipe.components) && recipe.components.length > 0);
        for (const component of recipe.components) {
          assert.ok(
            entry.exports.includes(component.exportName),
            `${recipe.id}: unknown export ${component.exportName}`,
          );
          assert.ok(component.purpose?.trim(), `${recipe.id}/${component.exportName}: purpose`);
          assert.ok(Array.isArray(component.requiredProps));
        }
      }
    });
  }
}

// The manifest's recipe contracts must match the real vendored component props, otherwise
// the Design Director plans and the quality validator approve calls that crash at SSR.
// Parse `export function X({…}: { a: T; b?: U })` type blocks and treat props without `?`
// as required. (Bklit AreaChart regression: label was missing from requiredProps.)
function findComponentSignature(source, exportName) {
  const start = source.search(new RegExp(`export function ${exportName}\\b`));
  if (start === -1) {
    return null;
  }
  const colon = source.indexOf("}: {", start);
  if (colon === -1) {
    return null;
  }
  let depth = 1;
  let i = colon + 4;
  while (i < source.length && depth > 0) {
    const ch = source[i];
    if (ch === "{") depth += 1;
    if (ch === "}") depth -= 1;
    i += 1;
  }
  return source.slice(colon + 4, i - 1);
}

function requiredPropsFromTypeBlock(block) {
  const required = [];
  for (const raw of block.split("\n")) {
    const line = raw.trim().replace(/;$/, "");
    if (!line || line.startsWith("//")) {
      continue;
    }
    const match = /^(\w+)(\?)?:/.exec(line);
    if (match && !match[2] && !line.includes("React.ReactNode")) {
      required.push(match[1]);
    }
  }
  return required;
}

for (const [slot, entries] of Object.entries(manifest)) {
  for (const entry of entries) {
    const libraryDir = path.join(root, "src", "libraries", entry.id);
    test(`${slot}/${entry.id} recipe requiredProps match the real component signatures`, () => {
      if (!fs.existsSync(libraryDir)) {
        return;
      }
      const byExport = new Map();
      for (const file of fs.readdirSync(libraryDir)) {
        if (!file.endsWith(".tsx")) {
          continue;
        }
        const source = fs.readFileSync(path.join(libraryDir, file), "utf8");
        for (const exportName of entry.exports) {
          const typeBlock = findComponentSignature(source, exportName);
          if (typeBlock) {
            byExport.set(exportName, requiredPropsFromTypeBlock(typeBlock));
          }
        }
      }
      for (const recipe of entry.recipes) {
        for (const component of recipe.components) {
          const actual = byExport.get(component.exportName);
          if (actual === null || actual === undefined) {
            continue;
          }
          const declared = new Set(component.requiredProps);
          const missing = actual.filter((prop) => !declared.has(prop));
          assert.deepEqual(
            missing,
            [],
            `${recipe.id}/${component.exportName}: manifest requiredProps miss required props from the component signature: ${missing.join(", ")}`,
          );
        }
      }
    });
  }
}
