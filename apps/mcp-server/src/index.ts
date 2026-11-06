import { OAuthProvider } from "@cloudflare/workers-oauth-provider";
import { McpServer } from "@modelcontextprotocol/server";
import { createMcpHandler } from "agents/mcp/server";
import { env as workerEnv } from "cloudflare:workers";
import { z } from "zod";
import { authHandler } from "./auth";
import type { Env } from "./env";
import { StageApiError, stageApi } from "./stageApi";
import { STEP_GUIDE, STEPS } from "./steps";

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

const STEP = z.enum(["research", "strategy", "moodboard", "styleguide", "flows", "generate", "delivery"]);

function createServer() {
  const server = new McpServer({ name: "Stage", version: "0.2.0" }, { instructions: STEP_GUIDE });

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

  const projectId = z.string().describe("Project id from list_projects.");

  server.registerTool(
    "get_project",
    { description: "One Stage project: name, client, type, dates and phases.", inputSchema: z.object({ projectId }) },
    ({ projectId }) => run(() => stageApi(`/projects/${encodeURIComponent(projectId)}`)),
  );

  server.registerTool(
    "get_step_results",
    {
      description: "The saved results of a project's Stage steps (research, strategy, moodboard, styleguide, flows, generate = wireframes, delivery). Leave step empty for all steps.",
      inputSchema: z.object({ projectId, step: STEP.optional() }),
    },
    ({ projectId, step }) => run(() => stageApi(`/projects/${encodeURIComponent(projectId)}/ai/artifacts${step ? `?module=${step}` : ""}`)),
  );

  server.registerTool(
    "create_project",
    {
      description: "Create a Stage project in the user's own workspace.",
      inputSchema: z.object({
        name: z.string().min(1),
        clientName: z.string().min(1).describe("Client or company the work is for; the user's own name for personal work."),
        clientEmail: z.string().email().describe("Client's email (Stage uses it for the client portal). Ask the user; for personal work use their own email from whoami."),
        type: z.enum(["websites", "web-apps", "ios-apps"]),
        startDate: z.string().date().describe("YYYY-MM-DD"),
        endDate: z.string().date().describe("YYYY-MM-DD, on or after startDate"),
      }),
    },
    ({ startDate, endDate, ...project }) =>
      run(() => stageApi("/projects", { ...project, startDate: Date.parse(startDate), endDate: Date.parse(endDate) })),
  );

  for (const [step, { tool, title, artifactKind, input, instructions }] of Object.entries(STEPS)) {
    server.registerTool(
      tool,
      {
        description: `Save the ${title} step of a Stage project. It replaces the previous ${title}.\n${instructions}\n${STEP_GUIDE}`,
        inputSchema: z.object({ projectId, summary: z.string().optional().describe("One line for the project overview."), result: input }),
      },
      ({ projectId, summary, result }) =>
        run(() => stageApi(`/projects/${encodeURIComponent(projectId)}/steps/${step}`, {
          title,
          summary,
          result: { ...result, projectId, apiVersion: "v1", artifactKind },
        })),
    );
  }

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
