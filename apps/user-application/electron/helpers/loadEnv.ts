import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { config } from "dotenv";
import { app } from "electron";

function loadEnvFile(path: string, override = false) {
  if (!existsSync(path)) {
    return;
  }

  config({ path, quiet: true, override });
}

function normalizeSecretAliases() {
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

export function loadLocalEnv() {
  if (app.isPackaged) {
    loadEnvFile(join(process.resourcesPath, "runtime-secrets.env"));
  } else {
    loadEnvFile(resolve(process.cwd(), ".env"));
  }

  normalizeSecretAliases();
}
