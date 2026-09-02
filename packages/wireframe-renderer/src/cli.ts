import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
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

const FREE_IMPORTS = new Set(["react", "lucide-react", "motion", "motion/react"]);
const FORBIDDEN_GLOBALS =
  /\b(process|globalThis|global|require|eval|Function|fetch|WebSocket|XMLHttpRequest)\b/;
const UTILS_STUB = `export function cn(...inputs: Array<string | false | null | undefined>) {
  return inputs.filter(Boolean).join(" ");
}
`;
const NEXT_LINK_STUB = `import React from "react";

type LinkProps = {
  href?: string;
  children?: React.ReactNode;
  className?: string;
  [key: string]: unknown;
};

export default function Link({ href, children, className, ...props }: LinkProps) {
  return (
    <a href={typeof href === "string" && href ? href : "#"} className={className} {...props}>
      {children}
    </a>
  );
}
`;

type CatalogFile = { path: string; content: string };
type ScreenInput = { id: string; tsx: string };
type BatchInput = {
  version: 2;
  /** The project's style guide, mapped onto the CSS variables the screen reads. */
  theme?: BrandTheme;
  screens: ScreenInput[];
  /** Retrieved catalog source files. `@/` resolves to this set. */
  catalog?: CatalogFile[];
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
  if (input.version !== 2) throw new Error("Renderer input version must be 2.");
  if (!Array.isArray(input.screens)) throw new Error("Renderer input must include screens[].");
  if (input.catalog !== undefined) {
    if (!Array.isArray(input.catalog)) throw new Error("Renderer catalog must be an array.");
    for (const file of input.catalog) {
      if (!file || typeof file.path !== "string" || typeof file.content !== "string") {
        throw new Error("Renderer catalog entries must include path and content.");
      }
    }
  }
  return input as BatchInput;
}

function safeCatalogPath(root: string, filePath: string): string | null {
  const normalized = filePath.trim().replaceAll("\\", "/").replace(/^\.\//, "");
  if (
    !normalized ||
    normalized.startsWith("/") ||
    normalized.includes("\0") ||
    normalized.split("/").some((segment) => segment === "..") ||
    /^[a-zA-Z]:\//.test(normalized)
  ) {
    return null;
  }
  const resolved = path.resolve(root, normalized);
  const rootResolved = path.resolve(root);
  if (resolved !== rootResolved && !resolved.startsWith(rootResolved + path.sep)) return null;
  return resolved;
}

function catalogPathSet(files: CatalogFile[]): Set<string> {
  return new Set(
    files.map((file) => file.path.trim().replaceAll("\\", "/").replace(/^\.\//, "")),
  );
}

function catalogSpecifierAllowed(specifier: string): boolean {
  if (!specifier.startsWith("@/")) return false;
  return safeCatalogPath(".", specifier.slice(2)) !== null;
}

function writeCatalog(batchDirectory: string, files: CatalogFile[]): { catalogDir: string } {
  const catalogDir = path.join(batchDirectory, "catalog");
  fs.mkdirSync(catalogDir, { recursive: true });
  const written: CatalogFile[] = [];
  for (const file of files) {
    const target = safeCatalogPath(catalogDir, file.path);
    if (!target) continue;
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, file.content, "utf8");
    written.push({
      path: file.path.trim().replaceAll("\\", "/").replace(/^\.\//, ""),
      content: file.content,
    });
  }
  const paths = catalogPathSet(written);
  const writeUtils = (relative: string) => {
    if (
      paths.has(relative) ||
      paths.has(relative.replace(/\.ts$/, ".tsx")) ||
      paths.has(relative.replace(/\.ts$/, ".js"))
    ) {
      return;
    }
    const target = path.join(catalogDir, ...relative.split("/"));
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, UTILS_STUB, "utf8");
    paths.add(relative);
  };
  writeUtils("lib/utils.ts");
  writeUtils("registry/default/lib/utils.ts");
  fs.writeFileSync(path.join(batchDirectory, "next-link.tsx"), NEXT_LINK_STUB, "utf8");
  return { catalogDir };
}

function catalogAliases(catalogDir: string, batchDirectory: string): Record<string, string> {
  return {
    "@": catalogDir,
    "next/link": path.join(batchDirectory, "next-link.tsx"),
  };
}

// Same gate for lucide-react: the model invents icon names (`Chrome`, `Figma`) that do not
// exist in the installed package and only fail at SSR. List real exports once from the
// package's type declarations — both `declare const X` and the aliased re-export block
// (`export { Globe2, CheckCircle2 as CheckCircle2Icon, … }`), or half the real icons
// (Globe2, CheckCircle2, AlertTriangle, …) get rejected as fake.
const LUCIDE_EXPORTS = (() => {
  try {
    const dts = fs.readFileSync(
      path.join(path.dirname(require.resolve("lucide-react/package.json")), "dist", "lucide-react.d.ts"),
      "utf8",
    );
    const names = new Set([...dts.matchAll(/^declare const (\w+)/gm)].map((m) => m[1]));
    for (const block of dts.matchAll(/export \{([\s\S]*?)\}/g)) {
      for (const entry of block[1].split(",")) {
        for (const name of entry.trim().split(/\s+as\s+/)) {
          if (/^\w+$/.test(name)) names.add(name);
        }
      }
    }
    return names;
  } catch {
    return null; // lucide-react not installed — let the bundler report it instead
  }
})();

function validateLucideImports(tsx: string) {
  if (!LUCIDE_EXPORTS) return;
  const named = tsx.matchAll(/import\s*\{([^}]*)\}\s*from\s*["']lucide-react["']/g);
  for (const match of named) {
    const requested = match[1]
      .split(",")
      .map((part) => part.split(/\sas\s/)[0].trim())
      .filter(Boolean);
    const missing = requested.filter((name) => !LUCIDE_EXPORTS.has(name));
    if (missing.length > 0) {
      throw new Error(
        `lucide-react does not export ${missing.join(", ")}. Pick a real icon from lucide.dev.`,
      );
    }
  }
}

function validateTsx(tsx: string) {
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
    if (FREE_IMPORTS.has(specifier) || specifier === "next/link") continue;
    if (catalogSpecifierAllowed(specifier)) continue;
    throw new Error(`Import "${specifier}" is not allowed.`);
  }
}

function writeScreens(input: BatchInput, batchDirectory: string) {
  fs.mkdirSync(batchDirectory, { recursive: true });

  const screens: Array<ScreenInput & { filePath: string }> = [];
  const errors: ScreenOutput[] = [];
  input.screens.forEach((screen, index) => {
    try {
      validateTsx(screen.tsx);
      validateLucideImports(screen.tsx);
      const safeId = screen.id.replaceAll(/[^a-zA-Z0-9_-]/g, "_") || `screen-${index}`;
      const source = /\bimport\s+(?:\*\s+as\s+)?React\b/.test(screen.tsx)
        ? screen.tsx
        : `import React from "react";\n${screen.tsx}`;
      const filePath = path.join(batchDirectory, `${index}-${safeId}.tsx`);
      fs.writeFileSync(filePath, source, "utf8");
      screens.push({ ...screen, filePath });
    } catch (error) {
      errors.push({
        id: screen.id,
        html: "",
        error: error instanceof Error ? error.stack ?? error.message : String(error),
      });
    }
  });
  return { screens, errors };
}

function buildCss(batchDirectory: string, theme: BrandTheme | undefined) {
  const globalCss = fs.readFileSync(path.join(ROOT, "src", "globals.css"), "utf8");
  const cssInput = [
    '@import "tailwindcss" source(none);',
    `@source "${path.join(ROOT, "src").replaceAll("\\", "/")}";`,
    `@source "${batchDirectory.replaceAll("\\", "/")}/*.tsx";`,
    `@source "${path.join(batchDirectory, "catalog").replaceAll("\\", "/")}/**/*.{ts,tsx}";`,
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

  return fs.readFileSync(outputPath, "utf8");
}

async function renderScreen(
  filePath: string,
  catalogDir: string,
  batchDirectory: string,
): Promise<string> {
  const outFile = filePath.replace(/\.tsx$/, ".ssr.mjs");
  await esbuild.build({
    entryPoints: [filePath],
    bundle: true,
    write: true,
    outfile: outFile,
    format: "esm",
    platform: "node",
    jsx: "automatic",
    external: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "lucide-react",
      "motion",
      "motion/react",
    ],
    alias: catalogAliases(catalogDir, batchDirectory),
    logLevel: "silent",
  });
  const module = await import(`${pathToFileURL(outFile).href}?v=${Date.now()}`);
  const Screen = module.default ?? module.Screen;
  if (typeof Screen !== "function") {
    throw new Error("Screen module must default-export function Screen().");
  }
  const markup = renderToStaticMarkup(React.createElement(Screen));
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
  catalogDir: string,
  batchDirectory: string,
): Promise<string> {
  const entryPath = screenFilePath.replace(/\.tsx$/, ".live.tsx");
  fs.writeFileSync(
    entryPath,
      `import React from "react";\n` +
      `import { createRoot } from "react-dom/client";\n` +
      `import * as ScreenModule from ${JSON.stringify(screenFilePath)};\n` +
      `const Screen = ScreenModule.default ?? ScreenModule.Screen;\n` +
      `const container = document.getElementById("root");\n` +
      `if (container && typeof Screen === "function") createRoot(container).render(React.createElement(Screen));\n`,
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
    alias: catalogAliases(catalogDir, batchDirectory),
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
  catalogDir: string,
  batchDirectory: string,
): Promise<{ html: string; repaired: boolean }> {
  try {
    return { html: await renderScreen(filePath, catalogDir, batchDirectory), repaired: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const source = fs.readFileSync(filePath, "utf8");
    if (!message.startsWith("Transform failed") || !source.includes('\\"')) {
      throw error;
    }
    const decoded = source.replaceAll('\\"', '"').replaceAll("\\'", "'");
    try {
      validateTsx(decoded);
      validateLucideImports(decoded);
      fs.writeFileSync(filePath, decoded, "utf8");
      return { html: await renderScreen(filePath, catalogDir, batchDirectory), repaired: true };
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
  pruneAbandonedBatches();

  try {
    const { catalogDir } = writeCatalog(batchDirectory, input.catalog ?? []);
    const { screens, errors } = writeScreens(input, batchDirectory);
    const css = buildCss(batchDirectory, input.theme);
    const output: ScreenOutput[] = errors;

    for (const screen of screens) {
      try {
        const { html, repaired } = await renderWithEscapeRepair(
          screen.filePath,
          catalogDir,
          batchDirectory,
        );
        const entry: ScreenOutput = { id: screen.id, html };
        if (repaired) entry.repaired = true;
        // Live bundle is best-effort: a bundling failure must not lose the static html.
        try {
          entry.liveHtml = await buildLiveDocument(
            screen.filePath,
            css,
            catalogDir,
            batchDirectory,
          );
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
    return { version: 2 as const, css, screens: output };
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
