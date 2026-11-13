import { OAuthProvider } from "@cloudflare/workers-oauth-provider";
import { McpServer } from "@modelcontextprotocol/server";
import { createMcpHandler, getMcpAuthContext } from "agents/mcp/server";
import type { McpPermission } from "@stage/data-ops/domain/mcpPermissions";
import { env as workerEnv } from "cloudflare:workers";
import { z } from "zod";
import { authHandler } from "./auth";
import type { Env, StageProps } from "./env";
import { StageApiError, stageApi } from "./stageApi";
import { staleSteps } from "@stage/data-ops/domain/aiStepRules";
import { resolveStyleGuideSpec, styleGuideDesignMarkdown } from "@stage/data-ops/domain/styleGuideSpec";
import { moodboardArtifactSchema } from "@stage/data-ops/contracts";
import { about } from "./annotations";
import { MOODBOARD_GUIDE, RESEARCH_INPUTS, STEP_GUIDE, STEPS, STYLE_GUIDE, stepToolInput } from "./steps";

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

// Which permission each step's save tool needs (step = the API's step name).
const STEP_PERMISSION: Record<keyof typeof STEPS, McpPermission> = { research: "research", strategy: "strategy", flows: "flows", generate: "wireframes" };

/** Each direction's style guide with its DESIGN.md, built by the same code as Stage for Mac's export. */
function styleGuides(content: unknown) {
  const moodboard = content ? moodboardArtifactSchema.parse(content) : null;
  if (!moodboard) return { styleGuides: [], directions: [] };
  return {
    directions: moodboard.directions,
    styleGuides: moodboard.styleGuides.map((guide) => {
      const name = moodboard.directions.find((direction) => direction.id === guide.directionId)?.name ?? guide.title;
      const images = moodboard.references.filter((reference) => reference.directionId === guide.directionId);
      return { ...guide, designMd: styleGuideDesignMarkdown(resolveStyleGuideSpec(guide, name, images), images) };
    }),
  };
}

function createServer() {
  const server = new McpServer({ name: "Stage", version: "0.2.0" }, { instructions: STEP_GUIDE });
  // Only list the tools the user allowed at sign-in; Stage refuses the rest anyway.
  // Connections from before per-step permissions list everything (their key still limits them).
  const granted = (getMcpAuthContext()?.props as StageProps | undefined)?.permissions;
  const allowed = (...needed: McpPermission[]) => !granted || needed.some((permission) => granted.includes(permission));

  server.registerTool(
    "whoami",
    { ...about("whoami"), description: "The Stage account this AI tool is connected to." },
    () => run(() => stageApi("/me")),
  );

  server.registerTool(
    "list_projects",
    { ...about("list_projects"), description: "List the user's Stage projects with their ids, names and status." },
    () => run(() => stageApi("/projects")),
  );

  const projectId = z.string().describe("Project id from list_projects.");

  server.registerTool(
    "get_project",
    { ...about("get_project"), description: "One Stage project: name, client, type, dates and phases.", inputSchema: z.object({ projectId }) },
    ({ projectId }) => run(() => stageApi(`/projects/${encodeURIComponent(projectId)}`)),
  );

  server.registerTool(
    "get_step_results",
    {
      ...about("get_step_results"),
      description: "The saved results of a project's Stage steps (research, strategy, moodboard, styleguide, flows, generate = wireframes, delivery). Leave step empty for all steps.",
      inputSchema: z.object({ projectId, step: STEP.optional() }),
    },
    ({ projectId, step }) => run(async () => {
      const id = encodeURIComponent(projectId);
      if (step !== "styleguide") return stageApi(`/projects/${id}/ai/artifacts${step ? `?module=${step}` : ""}`);
      // Style guides live inside the moodboard (one per direction).
      const { artifacts } = await stageApi(`/projects/${id}/ai/artifacts?module=moodboard`) as { artifacts: { contentJson: string | null }[] };
      return styleGuides(artifacts[0]?.contentJson ? JSON.parse(artifacts[0].contentJson) : null);
    }),
  );

  if (allowed("create_projects")) {
    server.registerTool(
      "create_project",
      {
        ...about("create_project"),
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
  }

  server.registerTool(
    "get_research_inputs",
    { ...about("get_research_inputs"), description: "The project's Research form (industry, website, brief, competitors, screens to analyze), shared with Stage for Mac.", inputSchema: z.object({ projectId }) },
    ({ projectId }) => run(() => stageApi(`/projects/${encodeURIComponent(projectId)}/research/inputs`)),
  );

  if (allowed("research")) {
    server.registerTool(
      "set_research_inputs",
      { ...about("set_research_inputs"), description: "Save the project's Research form. Ask the user for what you don't know; don't invent competitors.", inputSchema: z.object({ projectId, inputs: RESEARCH_INPUTS }) },
      ({ projectId, inputs }) => run(() => stageApi(`/projects/${encodeURIComponent(projectId)}/research/inputs`, inputs)),
    );
  }

  if (allowed("research")) {
    server.registerTool(
      "start_research",
      {
        ...about("start_research"),
        description: "Start Research the way Stage for Mac does: Stage collects real UI pattern screens for each screen type (Refero for apps, Details for websites) in the background and returns a runId at once. Then call get_run_status every few seconds until it says ready (usually under a minute); it returns the groups with screenshots. Uses the same credits as a Mac Research run, charged when save_research succeeds.",
        inputSchema: z.object({ projectId }),
      },
      ({ projectId }) => run(() => stageApi(`/projects/${encodeURIComponent(projectId)}/research/start`, {})),
    );
  }

  server.registerTool(
    "get_run_status",
    {
      ...about("get_run_status"),
      description: "Progress of a background job you started (start_research, add_to_moodboard): running, ready (Research screens collected, with the groups), done, or failed with the reason. Its \"next\" field says what to do.",
      inputSchema: z.object({ projectId, runId: z.string().min(1).describe("The runId start_research or add_to_moodboard returned.") }),
    },
    ({ projectId, runId }) => run(() => stageApi(`/projects/${encodeURIComponent(projectId)}/runs/${encodeURIComponent(runId)}`)),
  );

  for (const [step, { tool, title, artifactKind, input, instructions }] of Object.entries(STEPS)) {
    if (!allowed(STEP_PERMISSION[step as keyof typeof STEPS])) continue;
    const inputSchema = stepToolInput(step as keyof typeof STEPS);
    server.registerTool(
      tool,
      {
        ...about(tool),
        description: `Save the ${title} step of a Stage project. It replaces the previous ${title}.\n${instructions}\n${STEP_GUIDE}`,
        inputSchema,
      },
      ({ projectId, summary, result, ...rest }: { projectId: string; summary?: string; result: z.infer<typeof input>; runId?: string }) =>
        run(() => stageApi(`/projects/${encodeURIComponent(projectId)}/steps/${step}`, {
          title,
          summary,
          runId: rest.runId,
          result: { ...result, projectId, apiVersion: "v1", artifactKind },
        })),
    );
  }

  server.registerTool(
    "get_build_brief",
    {
      ...about("get_build_brief"),
      description: "Everything Stage knows to build the product, in one spec: the project, Strategy, the Style guide(s) from the Moodboard with each direction's DESIGN.md, Flows (screens and how they connect) and Wireframes (screen sections and HTML designs). Use it as the source of truth when you build. This is Delivery for AI tools; Figma and Paper exports are in Stage for Mac.",
      inputSchema: z.object({ projectId }),
    },
    ({ projectId }) => run(async () => {
      const id = encodeURIComponent(projectId);
      const [{ project }, { artifacts }] = await Promise.all([
        stageApi(`/projects/${id}`) as Promise<{ project: unknown }>,
        stageApi(`/projects/${id}/ai/artifacts`) as Promise<{ artifacts: { id: string; kind: string; contentJson: string | null }[] }>,
      ]);
      // Newest saved result per step (the list is newest first); content is stored as JSON text.
      const saved = (kind: string) => {
        const artifact = artifacts.find((entry) => entry.kind === kind);
        return artifact?.contentJson ? { id: artifact.id, content: JSON.parse(artifact.contentJson) as Record<string, unknown> } : null;
      };
      const latest = (kind: string): unknown => saved(kind)?.content ?? null;
      return {
        project,
        strategy: latest("strategyArtifact"),
        ...styleGuides(latest("moodboardArtifact")),
        flows: latest("flowsArtifact"),
        wireframes: latest("wireframesArtifact"),
        missing: ["strategyArtifact", "flowsArtifact", "wireframesArtifact"].filter((kind) => latest(kind) === null),
        // Built on an earlier Research/Strategy/Flows that was replaced since: redo these before building.
        stale: staleSteps({ research: saved("researchArtifact"), strategy: saved("strategyArtifact"), flows: saved("flowsArtifact"), wireframes: saved("wireframesArtifact") }),
      };
    }),
  );

  if (allowed("research", "moodboard")) {
    server.registerTool(
      "search_references",
      {
        ...about("search_references"),
        description: `Search real product screens. source "refero": app and web screens (moodboard, and Research UI patterns for web and iOS apps). source "details": real website sections (Research UI patterns for website projects). Returns id, title, product, thumbnailUrl and sourceUrl.\n${MOODBOARD_GUIDE}`,
        inputSchema: z.object({
          query: z.string().min(1).describe("What to look for, e.g. \"fintech dashboard with dense tables\" or \"pricing section with plan toggle\"."),
          source: z.enum(["refero", "details"]).default("refero").describe("details only for Research on website projects; refero for everything else."),
          platform: z.enum(["web", "ios", "android"]).default("web").describe("Refero only."),
        }),
      },
      (body) => run(() => stageApi("/references/search", body)),
    );
  }

  if (allowed("moodboard")) {
    server.registerTool(
      "add_to_moodboard",
      {
        ...about("add_to_moodboard"),
        description: `Add images to a project's moodboard (after Strategy). Pass Refero screens exactly as search_references returned them, direct image links (PNG, JPG, WebP, GIF, max 10 MB) and/or a Figma link (a file, board or frame; uses the Figma account connected in Stage, up to 12 frames). Stage imports them in the background, stores its own copy of each image and returns a runId at once; call get_run_status until it says done (it lists what was added and what failed, with the reason). With a direction name, the images go into that direction (created if new); its style guide comes next.\n${MOODBOARD_GUIDE}`,
        inputSchema: z.object({
          projectId,
          direction: z.string().min(1).describe("Direction name, e.g. \"Calm Editorial\". Reuse the same name to add more images to it."),
          screens: z.array(z.object({
            id: z.string(),
            title: z.string(),
            sourceUrl: z.string().url().optional(),
            thumbnailUrl: z.string().url().optional(),
            imageUrl: z.string().url().optional(),
          })).max(12).default([]),
          imageUrls: z.array(z.string().url()).max(12).default([]),
          figmaUrl: z.string().url().optional().describe("A Figma link from the user, e.g. https://www.figma.com/design/<key>/Name?node-id=1-2. A frame or section link imports it as one picture; a file link imports its top-level frames."),
        }),
      },
      ({ projectId, ...body }) => run(() => stageApi(`/projects/${encodeURIComponent(projectId)}/moodboard/references`, body)),
    );
  }

  if (allowed("moodboard")) {
    server.registerTool(
      "save_style_guide",
      {
        ...about("save_style_guide"),
        description: `Save the style guide for one moodboard direction. It replaces that direction's previous style guide. Wireframes use it.\n${STYLE_GUIDE.instructions}\n${STEP_GUIDE}`,
        inputSchema: z.object({
          projectId,
          direction: z.string().min(1).describe("The direction name used in add_to_moodboard."),
          styleGuide: STYLE_GUIDE.input,
        }),
      },
      ({ projectId, direction, styleGuide }) =>
        run(() => stageApi(`/projects/${encodeURIComponent(projectId)}/moodboard/style-guide`, { direction, styleGuide })),
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
