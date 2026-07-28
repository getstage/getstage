import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { MantineProvider } from "@mantine/core";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const BASE_IDS = new Set(["shadcn-ui", "kokonut-ui", "origin-ui", "mantine"]);
const SECTION_IDS = new Set(["magic-ui", "aceternity-ui"]);
const ALLOWED_IMPORTS = new Set(["react", "lucide-react", "@stage/base", "@stage/sections"]);
const FORBIDDEN_GLOBALS =
  /\b(process|globalThis|global|require|eval|Function|fetch|WebSocket|XMLHttpRequest)\b/;

type ScreenInput = { id: string; tsx: string };
type BatchInput = {
  version: 1;
  baseLibraryId: string;
  sectionsLibraryId?: string | null;
  screens: ScreenInput[];
};
type ScreenOutput = { id: string; html: string; error?: string };

function validateBatch(value: unknown): BatchInput {
  if (!value || typeof value !== "object") throw new Error("Renderer input must be an object.");
  const input = value as Partial<BatchInput>;
  if (input.version !== 1) throw new Error("Renderer input version must be 1.");
  if (!input.baseLibraryId || !BASE_IDS.has(input.baseLibraryId)) {
    throw new Error(`Unsupported base library: ${input.baseLibraryId ?? "missing"}`);
  }
  if (input.sectionsLibraryId && !SECTION_IDS.has(input.sectionsLibraryId)) {
    throw new Error(`Unsupported sections library: ${input.sectionsLibraryId}`);
  }
  if (!Array.isArray(input.screens)) throw new Error("Renderer input must include screens[].");
  return input as BatchInput;
}

function validateTsx(tsx: string, hasSections: boolean) {
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
    if (!ALLOWED_IMPORTS.has(specifier)) {
      throw new Error(`Import "${specifier}" is not allowed.`);
    }
    if (specifier === "@stage/sections" && !hasSections) {
      throw new Error("TSX imports @stage/sections, but no Sections library is selected.");
    }
  }
}

function writeScreens(input: BatchInput, batchDirectory: string) {
  fs.mkdirSync(batchDirectory, { recursive: true });
  const nodeModules = path.join(batchDirectory, "node_modules");
  if (!fs.existsSync(nodeModules)) {
    fs.symlinkSync(path.join(ROOT, "node_modules"), nodeModules, "junction");
  }

  return input.screens.map((screen, index) => {
    validateTsx(screen.tsx, Boolean(input.sectionsLibraryId));
    const safeId = screen.id.replace(/[^a-zA-Z0-9_-]/g, "_") || `screen-${index}`;
    const source = /\bimport\s+(?:\*\s+as\s+)?React\b/.test(screen.tsx)
      ? screen.tsx
      : `import React from "react";\n${screen.tsx}`;
    const rewritten = source
      .replaceAll('"@stage/base"', `"@/libraries/${input.baseLibraryId}"`)
      .replaceAll("'@stage/base'", `'@/libraries/${input.baseLibraryId}'`)
      .replaceAll(
        '"@stage/sections"',
        `"@/libraries/${input.sectionsLibraryId ?? "__missing-sections__"}"`,
      )
      .replaceAll(
        "'@stage/sections'",
        `'@/libraries/${input.sectionsLibraryId ?? "__missing-sections__"}'`,
      );
    const filePath = path.join(batchDirectory, `${index}-${safeId}.tsx`);
    fs.writeFileSync(filePath, rewritten, "utf8");
    return { ...screen, filePath };
  });
}

function buildCss(input: BatchInput, batchDirectory: string) {
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
  if (input.baseLibraryId !== "mantine") return tailwindCss;
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
  const batchDirectory = path.join(os.tmpdir(), "stage-wireframe-renderer", digest);
  const screens = writeScreens(input, batchDirectory);
  const css = buildCss(input, batchDirectory);
  const output: ScreenOutput[] = [];

  for (const screen of screens) {
    try {
      output.push({
        id: screen.id,
        html: await renderScreen(screen.filePath, input.baseLibraryId, css),
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
