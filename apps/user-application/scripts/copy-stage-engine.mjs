import { chmodSync, copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const engineRoot = resolve(appRoot, "../stage-engine");
const targetTriple = process.env.CARGO_BUILD_TARGET;
const releaseDir = targetTriple
  ? resolve(engineRoot, "target", targetTriple, "release")
  : resolve(engineRoot, "target", "release");
const source = resolve(releaseDir, "stage-engine");
const destinationDir = resolve(appRoot, "resources/stage-engine");
const destination = resolve(destinationDir, "stage-engine");

if (!existsSync(source)) {
  throw new Error(
    `Stage Engine binary not found at ${source}. Run cargo build --release first.`,
  );
}

mkdirSync(destinationDir, { recursive: true });
copyFileSync(source, destination);
chmodSync(destination, 0o755);
console.info(`[stage-release] copied ${source} -> ${destination}`);
