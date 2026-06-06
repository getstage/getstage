import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const COMMON_CLI_PATHS = [
  "/opt/homebrew/bin",
  "/usr/local/bin",
  join(homedir(), ".local", "bin"),
  join(homedir(), ".npm-global", "bin"),
];

export function augmentPathForProviderClis(pathValue: string | undefined): string {
  const existing = (pathValue ?? "").split(":").filter(Boolean);
  const existingSet = new Set(existing);
  const prepend = COMMON_CLI_PATHS.filter(
    (candidate) => existsSync(candidate) && !existingSet.has(candidate),
  );

  if (prepend.length === 0) {
    return existing.join(":");
  }

  return [...prepend, ...existing].join(":");
}
