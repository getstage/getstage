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
import * as esbuild from "esbuild";
import { themeCss, type BrandTheme } from "./theme";

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
  "@stage/sections": new Set(["magic-ui", "aceternity-ui", "react-bits"]),
  "@stage/charts": new Set(["bklit-ui"]),
};
const BASE_MODULE = "@stage/base";

/// Named exports each library actually provides, read from the same manifest the prompt
/// shows the model. Without this check a hallucinated name (Mantine's `Group` imported from
/// Kokonut) fails deep inside Node's ESM loader, and the repair pass gets a stack trace
/// instead of the one fact it needs: which names exist.
const LIBRARY_EXPORTS: Record<string, string[]> = (() => {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(ROOT, "manifests", "libraries.json"), "utf8"),
  ) as Record<string, { id: string; exports?: string[] }[]>;
  const byLibrary: Record<string, string[]> = {};
  for (const entries of Object.values(manifest)) {
    for (const entry of entries) byLibrary[entry.id] = entry.exports ?? [];
  }
  return byLibrary;
})();
const FREE_IMPORTS = new Set(["react", "lucide-react", "motion", "motion/react"]);
const FORBIDDEN_GLOBALS =
  /\b(process|globalThis|global|require|eval|Function|fetch|WebSocket|XMLHttpRequest)\b/;

type ScreenInput = { id: string; tsx: string };
type BatchInput = {
  version: 1;
  /** Virtual module specifier -> library directory under `src/libraries`. */
  libraries: Record<string, string>;
  /** The project's style guide, mapped onto the CSS variables the libraries read. */
  theme?: BrandTheme;
  screens: ScreenInput[];
};
type ScreenOutput = {
  id: string;
  html: string;
  /** Self-contained runnable HTML doc (React + motion) for the live preview. */
  liveHtml?: string;
  error?: string;
  repaired?: boolean;
};

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

function validateNamedImports(tsx: string, libraries: Record<string, string>) {
  const named = tsx.matchAll(/import\s*\{([^}]*)\}\s*from\s*["']([^"']+)["']/g);
  for (const match of named) {
    const libraryId = libraries[match[2]];
    if (!libraryId) continue;
    const available = LIBRARY_EXPORTS[libraryId];
    if (!available || available.length === 0) continue;

    const requested = match[1]
      .split(",")
      .map((part) => part.split(/\sas\s/)[0].trim())
      .filter(Boolean);
    const missing = requested.filter((name) => !available.includes(name));
    if (missing.length > 0) {
      throw new Error(
        `${libraryId} does not export ${missing.join(", ")}. ` +
          `Available from "${match[2]}": ${available.join(", ")}. ` +
          `Use plain HTML elements with Tailwind classes for text, headings, and layout.`,
      );
    }
  }
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

function rewriteModuleBindings(tsx: string, bindings: [string, string][]) {
  return bindings.reduce(
    (acc, [module, libraryId]) =>
      acc
        .replaceAll(`"${module}"`, `"@/libraries/${libraryId}"`)
        .replaceAll(`'${module}'`, `'@/libraries/${libraryId}'`),
    tsx,
  );
}

function writeScreens(input: BatchInput, batchDirectory: string) {
  fs.mkdirSync(batchDirectory, { recursive: true });

  const bindings = Object.entries(input.libraries);
  const boundModules = new Set(bindings.map(([module]) => module));

  return input.screens.map((screen, index) => {
    validateTsx(screen.tsx, boundModules);
    validateNamedImports(screen.tsx, input.libraries);
    const safeId = screen.id.replaceAll(/[^a-zA-Z0-9_-]/g, "_") || `screen-${index}`;
    const source = /\bimport\s+(?:\*\s+as\s+)?React\b/.test(screen.tsx)
      ? screen.tsx
      : `import React from "react";\n${screen.tsx}`;
    const rewritten = rewriteModuleBindings(source, bindings);
    const filePath = path.join(batchDirectory, `${index}-${safeId}.tsx`);
    fs.writeFileSync(filePath, rewritten, "utf8");
    return { ...screen, filePath };
  });
}

function buildCss(baseLibraryId: string, batchDirectory: string, theme: BrandTheme | undefined) {
  const globalCss = fs.readFileSync(path.join(ROOT, "src", "globals.css"), "utf8");
  const cssInput = [
    '@import "tailwindcss" source(none);',
    `@source "${path.join(ROOT, "src").replaceAll("\\", "/")}";`,
    `@source "${batchDirectory.replaceAll("\\", "/")}/*.tsx";`,
    globalCss.replace('@import "tailwindcss";', ""),
    // After globals.css so the project's brand overrides the grayscale defaults.
    themeCss(theme),
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

async function renderScreen(filePath: string, baseLibraryId: string): Promise<string> {
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
  // The compiled stylesheet no longer rides inside the fragment: it is identical
  // for every screen in the batch, and embedding it is what pushed artifacts past
  // Convex's 1 MiB document limit. The engine stores it once per run (see `css`
  // on the batch output) and pairs fragment + stylesheet at read time.
  return markup.startsWith("<") ? markup : `<div>${markup}</div>`;
}

/// The live preview needs a running React app, not a static string: motion/react, hover,
/// and springs only exist when JavaScript runs. esbuild bundles the screen (its vendored
/// library imports resolved via tsconfig paths) with React and motion into one
/// self-contained IIFE, wrapped in an HTML document with the run stylesheet inlined. The
/// desktop mounts this in an `allow-scripts` sandboxed iframe (own opaque origin, no
/// same-origin) so the model's code runs fully isolated from the app, Convex, and IPC.
/// The static `renderScreen` output above stays for Figma export, thumbnails, and the
/// fallback — Figma cannot run JavaScript, so it only ever gets the resting frame.
async function buildLiveDocument(
  screenFilePath: string,
  css: string,
  baseLibraryId: string,
): Promise<string> {
  const providerImport =
    baseLibraryId === "mantine" ? 'import { MantineProvider } from "@mantine/core";\n' : "";
  const rendered =
    baseLibraryId === "mantine"
      ? "React.createElement(MantineProvider, null, React.createElement(Screen))"
      : "React.createElement(Screen)";
  const entryPath = screenFilePath.replace(/\.tsx$/, ".live.tsx");
  fs.writeFileSync(
    entryPath,
    `import React from "react";\n` +
      `import { createRoot } from "react-dom/client";\n` +
      providerImport +
      `import * as ScreenModule from ${JSON.stringify(screenFilePath)};\n` +
      `const Screen = ScreenModule.default ?? ScreenModule.Screen;\n` +
      `const container = document.getElementById("root");\n` +
      `if (container && typeof Screen === "function") createRoot(container).render(${rendered});\n`,
    "utf8",
  );

  const result = await esbuild.build({
    entryPoints: [entryPath],
    bundle: true,
    write: false,
    format: "iife",
    platform: "browser",
    jsx: "automatic",
    minify: true,
    legalComments: "none",
    tsconfig: path.join(ROOT, "tsconfig.json"),
    // Browser has no `process` — vendored components read it (e.g. v0-button's
    // VERCEL_PROJECT_PRODUCTION_URL). Without a stub the live bundle throws at
    // `process is not defined` and React never mounts → blank white iframe.
    // `define` can't inject an object literal, so: `define` rewrites every
    // `process.env` to itself (keeps the `process` identifier alive), and the
    // banner declares `process` before the IIFE runs.
    banner: { js: 'var process = { env: { NODE_ENV: "production" } };' },
    define: { "process.env": "process.env" },
    logLevel: "silent",
  });
  const js = result.outputFiles[0]?.text ?? "";
  return (
    `<!doctype html><html><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width, initial-scale=1">` +
    `<style>${css}</style></head><body><div id="root"></div>` +
    `<script>${js}</script></body></html>`
  );
}

/// The model sometimes double-escapes quotes inside the TSX string (`className=\"...\"`),
/// which fails the esbuild transform — "Unexpected backslash in JSX element" when the escape
/// lands in the JSX body, a plain syntax error when the import line itself is escaped. That
/// is a mechanical mistake, not a design one — decode the escapes and retry once instead of
/// spending a full model repair round-trip on it.
///
/// The decode has to redo everything the escaped text slipped past: import validation and the
/// virtual-module rewrite both match on quote characters, so the raw file was neither checked
/// nor rebound. Gated on transform failures (never render errors) plus the file actually
/// containing `\"`, so valid files and screens failing for any other reason are never
/// rewritten. When the retry still fails, the newer error describes the decoded source the
/// model actually meant, which is the more useful input for the repair pass.
async function renderWithEscapeRepair(
  filePath: string,
  baseLibraryId: string,
  libraries: Record<string, string>,
): Promise<{ html: string; repaired: boolean }> {
  try {
    return { html: await renderScreen(filePath, baseLibraryId), repaired: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const source = fs.readFileSync(filePath, "utf8");
    if (!message.startsWith("Transform failed") || !source.includes('\\"')) {
      throw error;
    }
    const decoded = source.replaceAll('\\"', '"').replaceAll("\\'", "'");
    const bindings = Object.entries(libraries);
    try {
      validateTsx(decoded, new Set(bindings.map(([module]) => module)));
      validateNamedImports(decoded, libraries);
      fs.writeFileSync(filePath, rewriteModuleBindings(decoded, bindings), "utf8");
      return { html: await renderScreen(filePath, baseLibraryId), repaired: true };
    } catch (retryError) {
      throw retryError instanceof Error ? retryError : error;
    }
  }
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
    const css = buildCss(baseLibraryId, batchDirectory, input.theme);
    const output: ScreenOutput[] = [];

    for (const screen of screens) {
      try {
        const { html, repaired } = await renderWithEscapeRepair(
          screen.filePath,
          baseLibraryId,
          input.libraries,
        );
        const entry: ScreenOutput = { id: screen.id, html };
        if (repaired) entry.repaired = true;
        // Live bundle is best-effort: a bundling failure must not lose the static html.
        try {
          entry.liveHtml = await buildLiveDocument(screen.filePath, css, baseLibraryId);
        } catch {
          // keep the static-only entry
        }
        output.push(entry);
      } catch (error) {
        output.push({
          id: screen.id,
          html: "",
          error: error instanceof Error ? error.stack ?? error.message : String(error),
        });
      }
    }
    return { version: 1 as const, css, screens: output };
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
