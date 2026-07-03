import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const destination = resolve(appRoot, "resources/runtime-secrets.env");

// Only bake public runtime config into packaged builds. API keys (Refero, OpenRouter)
// are fetched at runtime from Convex after the user signs in.
const entries = [
  ["R2_PUBLIC_BASE_URL", process.env.R2_PUBLIC_BASE_URL],
].filter(([, value]) => typeof value === "string" && value.trim().length > 0);

mkdirSync(dirname(destination), { recursive: true });

if (entries.length === 0) {
  writeFileSync(
    destination,
    "# No runtime config was provided at build time.\n# Set GitHub secret R2_PUBLIC_BASE_URL for CI releases.\n# Set REFERO_MCP_TOKEN and OPENROUTER_API_KEY in the Convex deployment env instead.\n",
    "utf8",
  );
  console.info("[stage-release] wrote empty runtime-secrets.env (no config in env)");
} else {
  const body = `${entries.map(([key, value]) => `${key}=${value.trim()}`).join("\n")}\n`;
  writeFileSync(destination, body, "utf8");
  console.info(
    `[stage-release] wrote runtime-secrets.env with ${entries.map(([key]) => key).join(", ")}`,
  );
}
