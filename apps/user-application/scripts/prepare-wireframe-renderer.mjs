import { rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = resolve(appRoot, "../..");
const target = resolve(appRoot, "resources/wireframe-renderer");
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

rmSync(target, { recursive: true, force: true });
const result = spawnSync(
  pnpm,
  [
    "--filter",
    "@stage/wireframe-renderer",
    "deploy",
    "--prod",
    "--legacy",
    target,
  ],
  { cwd: repositoryRoot, stdio: "inherit" },
);

if (result.status !== 0) {
  throw new Error(`Wireframe renderer deploy failed with exit code ${result.status ?? "unknown"}.`);
}

console.info(`[stage-release] prepared wireframe renderer at ${target}`);
