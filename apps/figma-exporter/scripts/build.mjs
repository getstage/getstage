import { build } from "esbuild";
import { copyFile, mkdir } from "node:fs/promises";

const apiBase = process.env.STAGE_API_BASE ?? "https://reliable-bullfrog-917.convex.site";

await mkdir(new URL("../dist", import.meta.url), { recursive: true });
await build({
  entryPoints: [new URL("../src/code.ts", import.meta.url).pathname],
  outfile: new URL("../dist/code.js", import.meta.url).pathname,
  bundle: true,
  format: "iife",
  target: "es2022",
  define: {
    __STAGE_API_BASE__: JSON.stringify(apiBase.replace(/\/$/, "")),
  },
});
await copyFile(
  new URL("../src/ui.html", import.meta.url),
  new URL("../dist/ui.html", import.meta.url),
);
