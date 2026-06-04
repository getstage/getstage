import { existsSync } from "node:fs";
import { join } from "node:path";
import { app } from "electron";

const PACKAGED_ENGINE_DIR = "stage-engine";
const PACKAGED_ENGINE_NAME = "stage-engine";

export function getPackagedStageEngineBinaryPath() {
  if (!app.isPackaged) {
    return null;
  }

  const candidate = join(process.resourcesPath, PACKAGED_ENGINE_DIR, PACKAGED_ENGINE_NAME);

  return existsSync(candidate) ? candidate : null;
}
