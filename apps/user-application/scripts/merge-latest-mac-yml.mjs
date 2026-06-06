import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

function parseManifest(text) {
  const version = text.match(/^version:\s*(.+)$/m)?.[1]?.trim();
  const releaseDate = text.match(/^releaseDate:\s*(.+)$/m)?.[1]?.trim();
  const path = text.match(/^path:\s*(.+)$/m)?.[1]?.trim();
  const sha512 = text.match(/^sha512:\s*(.+)$/m)?.[1]?.trim();
  const files = [];

  for (const match of text.matchAll(
    /^\s+-\s+url:\s+(.+)\n\s+sha512:\s+(.+)\n\s+size:\s+(\d+)/gm,
  )) {
    files.push({
      url: match[1].trim(),
      sha512: match[2].trim(),
      size: Number(match[3]),
    });
  }

  if (!version || files.length === 0) {
    throw new Error("Invalid latest-mac.yml — missing version or files");
  }

  return { version, files, path, sha512, releaseDate };
}

function formatManifest(manifest) {
  const fileLines = manifest.files
    .sort((a, b) => a.url.localeCompare(b.url))
    .map(
      (file) =>
        `  - url: ${file.url}\n    sha512: ${file.sha512}\n    size: ${file.size}`,
    )
    .join("\n");

  return [
    `version: ${manifest.version}`,
    "files:",
    fileLines,
    `path: ${manifest.path}`,
    `sha512: ${manifest.sha512}`,
    `releaseDate: ${manifest.releaseDate}`,
    "",
  ].join("\n");
}

function mergeManifests(manifests) {
  const [primary, ...rest] = manifests;
  const filesByUrl = new Map();

  for (const manifest of manifests) {
    for (const file of manifest.files) {
      filesByUrl.set(file.url, file);
    }
  }

  const releaseDate = manifests
    .map((manifest) => manifest.releaseDate)
    .filter(Boolean)
    .sort()
    .at(-1);

  return {
    version: primary.version,
    files: [...filesByUrl.values()],
    path: primary.path,
    sha512: primary.sha512,
    releaseDate,
  };
}

const [arm64Path, x64Path, outputPath] = process.argv.slice(2);

if (!arm64Path || !x64Path || !outputPath) {
  console.error(
    "Usage: node merge-latest-mac-yml.mjs <arm64/latest-mac.yml> <x64/latest-mac.yml> <out/latest-mac.yml>",
  );
  process.exit(1);
}

const arm64 = parseManifest(readFileSync(resolve(arm64Path), "utf8"));
const x64 = parseManifest(readFileSync(resolve(x64Path), "utf8"));

if (arm64.version !== x64.version) {
  throw new Error(
    `Version mismatch: arm64=${arm64.version} x64=${x64.version}`,
  );
}

const merged = mergeManifests([arm64, x64]);
writeFileSync(resolve(outputPath), formatManifest(merged));
console.info(
  `[stage-release] merged latest-mac.yml (${merged.files.length} files, v${merged.version})`,
);
