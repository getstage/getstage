import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { config } from "dotenv";

export function loadLocalEnv() {
  const envPath = resolve(process.cwd(), ".env");

  if (!existsSync(envPath)) {
    return;
  }

  config({ path: envPath, quiet: true });

  if (!process.env.REFERO_MCP_TOKEN?.trim()) {
    const referoToken = process.env.refero_mcp_token ?? process.env.VITE_REFERO_MCP_TOKEN;
    if (referoToken?.trim()) {
      process.env.REFERO_MCP_TOKEN = referoToken.trim();
    }
  }

  if (!process.env.OPENROUTER_API_KEY?.trim()) {
    const openRouterKey =
      process.env.openrouter_api_key ?? process.env.STAGE_OPENROUTER_API_KEY;
    if (openRouterKey?.trim()) {
      process.env.OPENROUTER_API_KEY = openRouterKey.trim();
    }
  }
}
