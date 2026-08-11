#!/usr/bin/env node
/**
 * Build-time registry vendor for the wireframe renderer.
 *
 * Discovery is one index file per shadcn-style registry (e.g.
 * `https://kokonutui.com/r/registry.json`); the per-component source is
 * `<base>/r/<name>.json`. This script snapshots chosen components INTO the repo
 * so the renderer stays offline at run time — no runtime fetch, no cron.
 *
 * It fetches each component's registry JSON, rejects motion-dependent or
 * externally-dependent ones (unless --allow-motion), adapts the source for the
 * renderer's virtual-module sandbox, writes `src/components/<dir>/<name>.tsx`,
 * merges the component's keyframes into `globals.css`, and wires the library
 * index + libraries.json exports. A fixture render is still the final gate
 * (run separately) — the deps list alone misses hidden imports.
 *
 * Usage:
 *   node scripts/vendor-registry.mjs <libraryId> <name...> [--allow-motion]
 *   node scripts/vendor-registry.mjs magic-ui neon-gradient-card retro-grid
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** libraryId → registry item URL + local component dir + libraries.json slot. */
const REGISTRIES = {
  "kokonut-ui": {
    item: (n) => `https://kokonutui.com/r/${n}.json`,
    dir: "kokonutui",
    indexPath: "src/libraries/kokonut-ui/index.ts",
    slot: "base",
  },
  "magic-ui": {
    item: (n) => `https://magicui.design/r/${n}.json`,
    dir: "magicui",
    indexPath: "src/libraries/magic-ui/index.ts",
    slot: "sections",
  },
  "react-bits": {
    // React Bits registry items are `<PascalName>-TS-TW`; pass the PascalName.
    item: (n) => `https://raw.githubusercontent.com/DavidHDev/react-bits/main/public/r/${n}-TS-TW.json`,
    dir: "reactbits",
    indexPath: "src/libraries/react-bits/index.ts",
    slot: "sections",
    pascal: true,
  },
};

function toPascal(name) {
  return name
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

const MOTION_DEPS = new Set(["motion", "framer-motion"]);
const EXTERNAL_BLOCK = [
  "next-themes",
  "three",
  "@react-three",
  "gsap",
  "cobe",
  "canvas-confetti",
  "shiki",
  "embla-carousel",
];

function adaptContent(content) {
  let c = content;
  c = c.replace(/^\s*["']use client["'];?\s*\n/m, "");
  // next/* have no place in the sandbox: image → plain img, link → anchor.
  c = c.replace(/import\s+Image\s+from\s+["']next\/image["'];?\n?/g, "");
  c = c.replace(/<Image\b/g, "<img");
  c = c.replace(/import\s+Link\s+from\s+["']next\/link["'];?\n?/g, "");
  c = c.replace(/<Link\b/g, "<a").replace(/<\/Link>/g, "</a>");
  // Drop next/image-only boolean props left on the converted <img> (fill/priority/...).
  // Guarded so SVG `fill="..."`, `fill-rule`, and `fillOpacity` are untouched.
  c = c.replace(/ (fill|priority|unoptimized)(?=[\s/>])/g, "");
  return c;
}

function detectExports(content) {
  const names = new Set();
  for (const m of content.matchAll(/export\s+(?:async\s+)?function\s+([A-Za-z0-9_]+)/g)) {
    names.add(m[1]);
  }
  for (const m of content.matchAll(/export\s+const\s+([A-Za-z0-9_]+)/g)) names.add(m[1]);
  for (const m of content.matchAll(/export\s*\{([^}]+)\}/g)) {
    for (const part of m[1].split(",")) {
      const name = part.split(/\sas\s/).pop().trim();
      if (name && name !== "default") names.add(name);
    }
  }
  return { names: [...names], hasDefault: /export\s+default\b/.test(content) };
}

function declsToText(decls, pad) {
  return Object.entries(decls)
    .map(([prop, val]) => `${pad}${prop}: ${val};`)
    .join("\n");
}

/** shadcn registry `css` JSON → CSS text (handles @keyframes → step → decls). */
function cssObjToText(cssObj) {
  let out = "";
  for (const [selector, body] of Object.entries(cssObj)) {
    out += `  ${selector} {\n`;
    for (const [step, decls] of Object.entries(body)) {
      if (decls && typeof decls === "object") {
        out += `    ${step} {\n${declsToText(decls, "      ")}\n    }\n`;
      } else {
        out += `    ${step}: ${decls};\n`;
      }
    }
    out += "  }\n";
  }
  return out;
}

function keyframeNames(cssObj) {
  return Object.keys(cssObj || {})
    .filter((k) => k.startsWith("@keyframes"))
    .map((k) => k.replace("@keyframes", "").trim());
}

function mergeKeyframes(item) {
  const globalsPath = path.join(ROOT, "src/globals.css");
  let globals = fs.readFileSync(globalsPath, "utf8");
  const cssVars = item.cssVars?.theme ?? {};
  const css = item.css ?? {};
  if (Object.keys(cssVars).length === 0 && Object.keys(css).length === 0) return [];

  const names = keyframeNames(css);
  // Skip keyframes already present (marquee/aurora/etc. were vendored earlier).
  const missing = names.filter((n) => !globals.includes(`@keyframes ${n}`));
  if (names.length > 0 && missing.length === 0) return [];

  const varLines = Object.entries(cssVars)
    .map(([k, v]) => `  --${k}: ${v};`)
    .join("\n");
  const block = `\n@theme inline {\n${varLines ? varLines + "\n" : ""}${cssObjToText(css)}}\n`;
  fs.writeFileSync(globalsPath, globals + block);
  return names;
}

function wireIndex(reg, componentName, exports, defaultExport) {
  const indexPath = path.join(ROOT, reg.indexPath);
  const idx = fs.readFileSync(indexPath, "utf8");
  const from = `"@/components/${reg.dir}/${componentName}"`;
  const line = defaultExport
    ? `export { default as ${defaultExport} } from ${from};\n`
    : `export { ${exports.join(", ")} } from ${from};\n`;
  if (idx.includes(from)) return false;
  fs.writeFileSync(indexPath, idx.endsWith("\n") ? idx + line : idx + "\n" + line);
  return true;
}

function wireManifest(libraryId, slot, exports, description) {
  const manifestPath = path.join(ROOT, "manifests/libraries.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const entry = manifest[slot].find((e) => e.id === libraryId);
  if (!entry) throw new Error(`manifest has no ${slot} entry for ${libraryId}`);
  let added = 0;
  for (const name of exports) {
    if (!entry.exports.includes(name)) {
      entry.exports.push(name);
      added++;
    }
  }
  if (description) {
    const note = ` ${exports.join("/")}: ${description}`;
    if (!entry.usage?.includes(exports[0] + ":")) {
      entry.usage = (entry.usage ?? "").trimEnd() + note;
    }
  }
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  return added;
}

async function vendorOne(libraryId, name, allowMotion) {
  const reg = REGISTRIES[libraryId];
  if (!reg) throw new Error(`unknown library ${libraryId}`);
  const res = await fetch(reg.item(name));
  if (!res.ok) return { name, skipped: `fetch ${res.status}` };
  const item = await res.json();

  const deps = item.dependencies ?? [];
  const motion = deps.some((d) => MOTION_DEPS.has(d));
  if (motion && !allowMotion) return { name, skipped: "needs-motion" };
  const external = deps.filter((d) => EXTERNAL_BLOCK.some((e) => d.includes(e)));
  if (external.length > 0) return { name, skipped: `external:${external.join(",")}` };

  const file = (item.files ?? []).find(
    (f) => (f.path || "").endsWith(".tsx") && (f.type || "").includes("registry:"),
  );
  if (!file?.content) return { name, skipped: "no tsx file" };

  const content = adaptContent(file.content);
  const { names, hasDefault } = detectExports(content);
  let exports = names;
  let defaultExport = null;
  if (names.length === 0) {
    if (!hasDefault) return { name, skipped: "no exports" };
    defaultExport = reg.pascal ? name : toPascal(name);
    exports = [defaultExport];
  }

  const target = path.join(ROOT, "src/components", reg.dir, `${name}.tsx`);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);

  const keyframes = mergeKeyframes(item);
  wireIndex(reg, name, exports, defaultExport);
  const added = wireManifest(libraryId, reg.slot, exports, item.description);

  return { name, exports, keyframes, manifestAdded: added, deps };
}

async function main() {
  const args = process.argv.slice(2);
  const allowMotion = args.includes("--allow-motion");
  const rest = args.filter((a) => a !== "--allow-motion");
  const [libraryId, ...comps] = rest;
  if (!libraryId || comps.length === 0) {
    console.error("usage: vendor-registry.mjs <libraryId> <name...> [--allow-motion]");
    process.exit(1);
  }
  const report = [];
  for (const name of comps) {
    try {
      report.push(await vendorOne(libraryId, name, allowMotion));
    } catch (error) {
      report.push({ name, skipped: `error: ${error.message}` });
    }
  }
  console.log(JSON.stringify(report, null, 2));
}

main();
