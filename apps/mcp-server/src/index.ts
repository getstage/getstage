import { OAuthProvider } from "@cloudflare/workers-oauth-provider";
import { createMcpHandler } from "agents/mcp/server";
import { env as workerEnv } from "cloudflare:workers";
import { authHandler } from "./auth";
import type { Env } from "./env";
import { createServer } from "./server";

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
