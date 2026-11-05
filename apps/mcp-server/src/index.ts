import { OAuthProvider } from "@cloudflare/workers-oauth-provider";
import { McpServer } from "@modelcontextprotocol/server";
import { createMcpHandler } from "agents/mcp/server";
import { env as workerEnv } from "cloudflare:workers";
import { authHandler } from "./auth";
import type { Env } from "./env";
import { StageApiError, stageApi } from "./stageApi";

type ToolResult = { content: { type: "text"; text: string }[]; isError?: boolean };

// Tool errors go back to the model as text so it can tell the user or retry.
async function run(action: () => Promise<unknown>): Promise<ToolResult> {
  try {
    return { content: [{ type: "text", text: JSON.stringify(await action(), null, 2) }] };
  } catch (error) {
    if (error instanceof StageApiError) return { content: [{ type: "text", text: error.message }], isError: true };
    throw error;
  }
}

function createServer() {
  const server = new McpServer({ name: "Stage", version: "0.1.0" });

  server.registerTool(
    "whoami",
    { description: "The Stage account this AI tool is connected to." },
    () => run(() => stageApi("/me")),
  );

  server.registerTool(
    "list_projects",
    { description: "List the user's Stage projects with their ids, names and status." },
    () => run(() => stageApi("/projects")),
  );

  return server;
}

const env = workerEnv as unknown as Env;
const mcpHandler = createMcpHandler(createServer, {
  route: "/mcp",
  allowedHostnames: [new URL(env.MCP_ORIGIN).hostname],
});

export default new OAuthProvider<Env>({
  apiRoute: "/mcp",
  apiHandler: {
    fetch(request: Request, handlerEnv: Env, ctx: ExecutionContext) {
      return mcpHandler(request, handlerEnv, ctx);
    },
  },
  defaultHandler: authHandler,
  authorizeEndpoint: "/authorize",
  tokenEndpoint: "/oauth/token",
  clientRegistrationEndpoint: "/oauth/register",
  clientIdMetadataDocumentEnabled: true,
  resourceMetadata: { resource: `${env.MCP_ORIGIN}/mcp` },
});
