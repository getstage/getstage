import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const destination = resolve(appRoot, "resources/runtime-secrets.env");

const entries = [
  ["REFERO_MCP_TOKEN", process.env.REFERO_MCP_TOKEN],
  ["OPENROUTER_API_KEY", process.env.OPENROUTER_API_KEY],
  // Public R2 custom domain. Not secret, but routed through the same bake-in
  // path so packaged desktop builds can resolve Hi-Fi Figma preview URLs.
  ["R2_PUBLIC_BASE_URL", process.env.R2_PUBLIC_BASE_URL],
].filter(([, value]) => typeof value === "string" && value.trim().length > 0);

mkdirSync(dirname(destination), { recursive: true });

if (entries.length === 0) {
  writeFileSync(
    destination,
    "# No runtime secrets were provided at build time.\n# Set GitHub secrets REFERERO_MCP_TOKEN, OPENROUTER_API_KEY, and R2_PUBLIC_BASE_URL for CI releases.\n",
    "utf8",
  );
  console.info("[stage-release] wrote empty runtime-secrets.env (no secrets in env)");
} else {
  const body = `${entries.map(([key, value]) => `${key}=${value.trim()}`).join("\n")}\n`;
  writeFileSync(destination, body, "utf8");
  console.info(
    `[stage-release] wrote runtime-secrets.env with ${entries.map(([key]) => key).join(", ")}`,
  );
}
