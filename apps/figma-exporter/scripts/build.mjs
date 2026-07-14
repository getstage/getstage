import { build } from "esbuild";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";

/** Production Convex HTTP site — published Figma plugin must match this. */
const PROD_API_BASE = "https://quirky-snail-763.convex.site";
const DEV_API_BASE = "https://reliable-bullfrog-917.convex.site";

const apiBase = (process.env.STAGE_API_BASE ?? PROD_API_BASE).replace(/\/$/, "");

await mkdir(new URL("../dist", import.meta.url), { recursive: true });
await build({
  entryPoints: [new URL("../src/code.ts", import.meta.url).pathname],
  outfile: new URL("../dist/code.js", import.meta.url).pathname,
  bundle: true,
  format: "iife",
  target: "es2017",
  define: {
    __STAGE_API_BASE__: JSON.stringify(apiBase),
  },
});
await copyFile(
  new URL("../src/ui.html", import.meta.url),
  new URL("../dist/ui.html", import.meta.url),
);

// Keep manifest allowlist in sync with the baked API base (prod by default).
const manifestPath = new URL("../manifest.json", import.meta.url);
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const domains = new Set(manifest.networkAccess?.allowedDomains ?? []);
domains.delete(PROD_API_BASE);
domains.delete(DEV_API_BASE);
domains.add(apiBase);
manifest.networkAccess = {
  ...manifest.networkAccess,
  allowedDomains: [
    apiBase,
    ...[...domains].filter((domain) => domain !== apiBase).sort(),
  ],
};
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
