import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { MantineProvider } from "./libraries/mantine";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);

/// Scratch space for one batch. The digest covers the screen source, so every run gets a
/// fresh directory that is never reused, and each holds a full compiled Tailwind build —
/// left behind they grow the repo by hundreds of KB per generation. A batch removes its own
/// directory when it finishes; the age sweep only exists to collect batches whose process
/// was killed before it could.
const BATCH_ROOT = path.join(ROOT, ".stage-batches");
const BATCH_TTL_MS = 60 * 60 * 1000;

function pruneAbandonedBatches() {
  if (!fs.existsSync(BATCH_ROOT)) return;
  const cutoff = Date.now() - BATCH_TTL_MS;
  for (const entry of fs.readdirSync(BATCH_ROOT)) {
    const directory = path.join(BATCH_ROOT, entry);
    try {
      if (fs.statSync(directory).mtimeMs < cutoff) {
        fs.rmSync(directory, { recursive: true, force: true });
      }
    } catch {
      // A concurrent renderer may have swept it first; nothing to recover.
    }
  }
}

/// The virtual modules generated TSX may import, and the library each one can resolve to.
/// A slot the run did not select is simply absent from `libraries` — there is no "none"
/// value to thread through the rewrite, so an unselected slot fails at validation with a
/// clear message instead of resolving to a missing directory.
const LIBRARY_SLOTS: Record<string, ReadonlySet<string>> = {
  "@stage/base": new Set(["shadcn-ui", "kokonut-ui", "origin-ui", "mantine"]),
  "@stage/sections": new Set(["magic-ui", "aceternity-ui"]),
  "@stage/charts": new Set(["bklit-ui"]),
};
const BASE_MODULE = "@stage/base";
const FREE_IMPORTS = new Set(["react", "lucide-react"]);
const FORBIDDEN_GLOBALS =
  /\b(process|globalThis|global|require|eval|Function|fetch|WebSocket|XMLHttpRequest)\b/;

type ScreenInput = { id: string; tsx: string };
type BatchInput = {
  version: 1;
  /** Virtual module specifier -> library directory under `src/libraries`. */
  libraries: Record<string, string>;
  screens: ScreenInput[];
};
type ScreenOutput = { id: string; html: string; error?: string };

function validateBatch(value: unknown): BatchInput {
  if (!value || typeof value !== "object") throw new Error("Renderer input must be an object.");
  const input = value as Partial<BatchInput>;
  if (input.version !== 1) throw new Error("Renderer input version must be 1.");

  const libraries = input.libraries;
  if (!libraries || typeof libraries !== "object") {
    throw new Error("Renderer input must include libraries{}.");
  }
  for (const [module, libraryId] of Object.entries(libraries)) {
    const allowed = LIBRARY_SLOTS[module];
    if (!allowed) throw new Error(`Unknown library slot: ${module}`);
    if (!allowed.has(libraryId)) {
      throw new Error(`Unsupported library for ${module}: ${libraryId}`);
    }
  }
  if (!libraries[BASE_MODULE]) throw new Error(`Renderer input must bind ${BASE_MODULE}.`);
  if (!Array.isArray(input.screens)) throw new Error("Renderer input must include screens[].");
  return input as BatchInput;
}

function validateTsx(tsx: string, boundModules: ReadonlySet<string>) {
  if (tsx.length > 250_000) throw new Error("Screen TSX exceeds 250 KB.");
  if (FORBIDDEN_GLOBALS.test(tsx) || /\bimport\s*\(/.test(tsx)) {
    throw new Error("Screen TSX contains a forbidden runtime capability.");
  }
  if (/\b(?:while|do)\s*(?:\(|\{)|\bfor\s*\(/.test(tsx)) {
    throw new Error("Screen TSX may not contain runtime loops.");
  }

  const imports = tsx.matchAll(
    /\b(?:import|export)\s+(?:[\s\S]*?\sfrom\s*)?["']([^"']+)["']/g,
  );
  for (const match of imports) {
    const specifier = match[1];
    if (FREE_IMPORTS.has(specifier) || boundModules.has(specifier)) continue;
    if (specifier in LIBRARY_SLOTS) {
      throw new Error(`TSX imports ${specifier}, but that library is not selected for this run.`);
    }
    throw new Error(`Import "${specifier}" is not allowed.`);
  }
}

function writeScreens(input: BatchInput, batchDirectory: string) {
  fs.mkdirSync(batchDirectory, { recursive: true });

  const bindings = Object.entries(input.libraries);
  const boundModules = new Set(bindings.map(([module]) => module));

  return input.screens.map((screen, index) => {
    validateTsx(screen.tsx, boundModules);
    const safeId = screen.id.replaceAll(/[^a-zA-Z0-9_-]/g, "_") || `screen-${index}`;
    const source = /\bimport\s+(?:\*\s+as\s+)?React\b/.test(screen.tsx)
      ? screen.tsx
      : `import React from "react";\n${screen.tsx}`;
    const rewritten = bindings.reduce(
      (tsx, [module, libraryId]) =>
        tsx
          .replaceAll(`"${module}"`, `"@/libraries/${libraryId}"`)
          .replaceAll(`'${module}'`, `'@/libraries/${libraryId}'`),
      source,
    );
    const filePath = path.join(batchDirectory, `${index}-${safeId}.tsx`);
    fs.writeFileSync(filePath, rewritten, "utf8");
    return { ...screen, filePath };
  });
}

function buildCss(baseLibraryId: string, batchDirectory: string) {
  const globalCss = fs.readFileSync(path.join(ROOT, "src", "globals.css"), "utf8");
  const cssInput = [
    '@import "tailwindcss" source(none);',
    `@source "${path.join(ROOT, "src").replaceAll("\\", "/")}";`,
    `@source "${batchDirectory.replaceAll("\\", "/")}/*.tsx";`,
    globalCss.replace('@import "tailwindcss";', ""),
  ].join("\n");
  const inputPath = path.join(batchDirectory, "input.css");
  const outputPath = path.join(batchDirectory, "output.css");
  fs.writeFileSync(inputPath, cssInput, "utf8");

  const cliPath = path.join(
    path.dirname(require.resolve("@tailwindcss/cli/package.json")),
    "dist",
    "index.mjs",
  );
  const result = spawnSync(
    process.execPath,
    [cliPath, "--input", inputPath, "--output", outputPath, "--minify", "--cwd", ROOT],
    { encoding: "utf8", env: process.env },
  );
  if (result.status !== 0) {
    throw new Error(`Tailwind compilation failed: ${result.stderr || result.stdout}`);
  }

  const tailwindCss = fs.readFileSync(outputPath, "utf8");
  if (baseLibraryId !== "mantine") return tailwindCss;
  const mantineCss = fs.readFileSync(require.resolve("@mantine/core/styles.css"), "utf8");
  return `${mantineCss}\n${tailwindCss}`;
}

async function renderScreen(
  filePath: string,
  baseLibraryId: string,
  css: string,
): Promise<string> {
  const module = await import(`${pathToFileURL(filePath).href}?v=${Date.now()}`);
  const Screen = module.default ?? module.Screen;
  if (typeof Screen !== "function") {
    throw new Error("Screen module must default-export function Screen().");
  }
  const screen = React.createElement(Screen);
  const root =
    baseLibraryId === "mantine"
      ? React.createElement(MantineProvider, null, screen)
      : screen;
  const markup = renderToStaticMarkup(root);
  const fragment = markup.startsWith("<") ? markup : `<div>${markup}</div>`;
  return `<style data-stage-render>${css}</style>\n${fragment}`;
}

async function renderBatch(input: BatchInput) {
  const digest = createHash("sha256")
    .update(JSON.stringify(input))
    .digest("hex")
    .slice(0, 16);
  const batchDirectory = path.join(BATCH_ROOT, digest);
  const baseLibraryId = input.libraries[BASE_MODULE];
  pruneAbandonedBatches();

  try {
    const screens = writeScreens(input, batchDirectory);
    const css = buildCss(baseLibraryId, batchDirectory);
    const output: ScreenOutput[] = [];

    for (const screen of screens) {
      try {
        output.push({
          id: screen.id,
          html: await renderScreen(screen.filePath, baseLibraryId, css),
        });
      } catch (error) {
        output.push({
          id: screen.id,
          html: "",
          error: error instanceof Error ? error.stack ?? error.message : String(error),
        });
      }
    }
    return { version: 1 as const, screens: output };
  } finally {
    fs.rmSync(batchDirectory, { recursive: true, force: true });
  }
}

async function main() {
  const raw = fs.readFileSync(0, "utf8");
  const output = await renderBatch(validateBatch(JSON.parse(raw)));
  process.stdout.write(JSON.stringify(output));
  if (output.screens.length > 0 && output.screens.every((screen) => screen.error)) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  process.stderr.write(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
});
