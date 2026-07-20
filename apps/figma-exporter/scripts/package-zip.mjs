import { cp, mkdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
const version = pkg.version;
const apiBase = (process.env.STAGE_API_BASE ?? "https://quirky-snail-763.convex.site").replace(
  /\/$/,
  "",
);
const isTesting = apiBase.includes("reliable-bullfrog");
const zipName = isTesting
  ? `stage-exporter-${version}-testing.zip`
  : `stage-exporter-${version}.zip`;
const folderName = zipName.replace(/\.zip$/, "");
const folderPath = path.join(root, folderName);
const zipPath = path.join(root, zipName);
const publicZipPath = path.join(root, "../user-application/public", zipName);

await rm(folderPath, { recursive: true, force: true });
await mkdir(path.join(folderPath, "dist"), { recursive: true });
await cp(path.join(root, "manifest.json"), path.join(folderPath, "manifest.json"));
await cp(path.join(root, "dist/code.js"), path.join(folderPath, "dist/code.js"));
await cp(path.join(root, "dist/ui.html"), path.join(folderPath, "dist/ui.html"));

await rm(zipPath, { force: true });
await new Promise((resolve, reject) => {
  const child = spawn("zip", ["-r", "-q", zipPath, "."], {
    cwd: folderPath,
    stdio: "inherit",
  });
  child.on("error", reject);
  child.on("exit", (code) => {
    if (code === 0) resolve();
    else reject(new Error(`zip exited with ${code}`));
  });
});

if (!isTesting) {
  await mkdir(path.dirname(publicZipPath), { recursive: true });
  await cp(zipPath, publicZipPath);
}

const manifest = JSON.parse(await readFile(path.join(folderPath, "manifest.json"), "utf8"));
console.log(`Packed ${zipName}`);
console.log(`  api: ${apiBase}`);
console.log(`  allowlist: ${(manifest.networkAccess?.allowedDomains ?? []).join(", ")}`);
console.log(`  path: ${zipPath}`);
if (!isTesting) {
  console.log(`  public: ${publicZipPath}`);
}
