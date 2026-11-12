import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { internal } from "../../_generated/api";
import { authenticateApiKey } from "../auth";
import {
  createProjectAiArtifactBodySchema,
  createProjectAiRunBodySchema,
  createPhaseBodySchema,
  createProjectBodySchema,
  importProjectPlanBodySchema,
  projectIdParamSchema,
  moodboardImportBodySchema,
  researchInputsBodySchema,
  saveStepBodySchema,
  stepParamSchema,
  styleGuideBodySchema,
  upsertProjectAiContextBodySchema,
} from "../models";
import { flowsArtifactSchema } from "../../../src/contracts/flows";
import { researchArtifactSchema, researchUiPatternInsightsSchema } from "../../../src/contracts/research";
import { aiStyleGuideSchema } from "../../../src/contracts/moodboard";
import { strategyArtifactSchema } from "../../../src/contracts/strategy";
import { wireframesArtifactSchema } from "../../../src/contracts/wireframes";
import { ApiError, jsonError, publicMessage, validationHook } from "../errors";
import type { ApiBindings } from "../types";
import type { Doc, Id } from "../../_generated/dataModel";
import { z } from "zod";

const STEP_RESULT_SCHEMA = {
  research: researchArtifactSchema.omit({ uiPatterns: true }).extend({ uiPatternInsights: researchUiPatternInsightsSchema }),
  strategy: strategyArtifactSchema,
  flows: flowsArtifactSchema,
  generate: wireframesArtifactSchema,
};

// Errors from a save are fixable by the AI tool (format, order, credits), so they come back as 400 with the reason.
function stepError(error: unknown, fallback: string) {
  const message = error instanceof Error ? publicMessage(error.message) : fallback;
  if (message.includes("not found")) return error;
  if (message === "insufficient_credits") return new ApiError(402, "Not enough Stage credits for this. Top up in Settings → Billing & Credits.", "insufficient_credits");
  return new ApiError(400, message, "step_not_saved");
}

/** "result.sections.0.title: Required" — the first problem, so the AI knows which field to fix. */
function firstIssue(issues: { path: PropertyKey[]; message: string }[]) {
  const [issue] = issues;
  return issue ? `${issue.path.length ? `${issue.path.map(String).join(".")}: ` : ""}${issue.message}` : "";
}

const runParamSchema = z.object({ id: z.string().min(1), runId: z.string().min(1) });

export function createProjectRoutes() {
  const app = new Hono<{
    Bindings: ApiBindings;
  }>();

  app.get("/", async (c) => {
    const auth = await authenticateApiKey(c);
    const projects = await c.env.runQuery(internal.domain.projects.service.listProjectsForApi, {
      userId: auth.userId,
      workspaceIds: auth.mcp?.workspaceIds,
    });

    return c.json({ projects });
  });

  app.post(
    "/generate",
    async (c) => {
      return jsonError(
        c,
        410,
        "Server-side project generation is deprecated. External AI should generate the structured project plan and call POST /api/v1/projects/import-plan or POST /api/v1/projects.",
        "deprecated_endpoint",
      );
    },
  );

  app.post(
    "/import-plan",
    zValidator("json", importProjectPlanBodySchema, validationHook),
    async (c) => {
      const auth = await authenticateApiKey(c);
      const body = c.req.valid("json");
      const project = await c.env.runMutation(internal.domain.projects.service.createProjectForApi, {
        userId: auth.userId,
        ...body,
        method: "ai",
      });

      return c.json({ project }, 201);
    },
  );

  app.get(
    "/:id/ai/context",
    zValidator("param", projectIdParamSchema, validationHook),
    async (c) => {
      const auth = await authenticateApiKey(c);
      const { id } = c.req.valid("param");
      const context = await c.env.runQuery(internal.projectAi.getContextForApi, {
        userId: auth.userId,
        projectId: id as Id<"projects">,
      });

      return c.json({
        context: context
          ? {
              id: String(context._id),
              projectId: String(context.projectId),
              clientWebsite: context.clientWebsite ?? null,
              competitorUrls: context.competitorUrls,
              referenceUrls: context.referenceUrls,
              brief: context.brief ?? null,
              briefAttachmentName: context.briefAttachmentName ?? null,
              briefAttachmentUrl: context.briefAttachmentUrl ?? null,
              notes: context.notes ?? null,
              updatedAt: context.updatedAt,
            }
          : null,
      });
    },
  );

  app.post(
    "/:id/ai/context",
    zValidator("param", projectIdParamSchema, validationHook),
    zValidator("json", upsertProjectAiContextBodySchema, validationHook),
    async (c) => {
      const auth = await authenticateApiKey(c);
      const { id } = c.req.valid("param");
      const body = c.req.valid("json");
      const result = await c.env.runMutation(internal.projectAi.upsertContextForApi, {
        userId: auth.userId,
        projectId: id as Id<"projects">,
        clientWebsite: body.clientWebsite,
        competitorUrls: body.competitorUrls,
        referenceUrls: body.referenceUrls,
        brief: body.brief,
        briefAttachmentName: body.briefAttachmentName,
        briefAttachmentR2ObjectKey: body.briefAttachmentR2ObjectKey,
        notes: body.notes,
      });

      return c.json({ contextId: String(result.contextId) }, 201);
    },
  );

  app.get(
    "/:id/ai/runs",
    zValidator("param", projectIdParamSchema, validationHook),
    async (c) => {
      const auth = await authenticateApiKey(c);
      const { id } = c.req.valid("param");
      const module = c.req.query("module");
      const runs = await c.env.runQuery(internal.projectAi.listRunsForApi, {
        userId: auth.userId,
        projectId: id as Id<"projects">,
        module: module as "research" | "strategy" | "generate" | "delivery" | undefined,
      }) as Doc<"projectAiRuns">[];

      return c.json({
        runs: runs.map((run: Doc<"projectAiRuns">) => ({
          id: String(run._id),
          projectId: String(run.projectId),
          connectionId: run.connectionId ? String(run.connectionId) : null,
          module: run.module,
          title: run.title,
          status: run.status,
          trigger: run.trigger,
          externalRunId: run.externalRunId ?? null,
          inputSummary: run.inputSummary ?? null,
          errorMessage: run.errorMessage ?? null,
          startedAt: run.startedAt,
          completedAt: run.completedAt ?? null,
          updatedAt: run.updatedAt,
        })),
      });
    },
  );

  app.post(
    "/:id/ai/runs",
    zValidator("param", projectIdParamSchema, validationHook),
    zValidator("json", createProjectAiRunBodySchema, validationHook),
    async (c) => {
      const auth = await authenticateApiKey(c);
      const { id } = c.req.valid("param");
      const body = c.req.valid("json");
      const result = await c.env.runMutation(internal.projectAi.createRunForApi, {
        userId: auth.userId,
        projectId: id as Id<"projects">,
        connectionId: body.connectionId as Id<"agentConnections"> | undefined,
        module: body.module,
        title: body.title,
        status: body.status,
        trigger: body.trigger,
        inputSummary: body.inputSummary,
        externalRunId: body.externalRunId,
      });

      return c.json({ runId: String(result.runId) }, 201);
    },
  );

  app.get(
    "/:id/ai/artifacts",
    zValidator("param", projectIdParamSchema, validationHook),
    async (c) => {
      const auth = await authenticateApiKey(c);
      const { id } = c.req.valid("param");
      const module = c.req.query("module");
      const artifacts = await c.env.runQuery(internal.projectAi.listArtifactsForApi, {
        userId: auth.userId,
        projectId: id as Id<"projects">,
        module: module as "research" | "strategy" | "generate" | "delivery" | undefined,
      }) as Doc<"projectAiArtifacts">[];

      return c.json({
        artifacts: artifacts.map((artifact: Doc<"projectAiArtifacts">) => ({
          id: String(artifact._id),
          projectId: String(artifact.projectId),
          runId: artifact.runId ? String(artifact.runId) : null,
          module: artifact.module,
          kind: artifact.kind,
          title: artifact.title,
          summary: artifact.summary ?? null,
          status: artifact.status,
          contentFormat: artifact.contentFormat,
          contentMarkdown: artifact.contentMarkdown ?? null,
          contentJson: artifact.contentJson ?? null,
          externalUrl: artifact.externalUrl ?? null,
          createdAt: artifact.createdAt,
          updatedAt: artifact.updatedAt,
          approvedAt: artifact.approvedAt ?? null,
        })),
      });
    },
  );

  app.post(
    "/:id/ai/artifacts",
    zValidator("param", projectIdParamSchema, validationHook),
    zValidator("json", createProjectAiArtifactBodySchema, validationHook),
    async (c) => {
      const auth = await authenticateApiKey(c);
      const { id } = c.req.valid("param");
      const body = c.req.valid("json");
      const result = await c.env.runMutation(internal.projectAi.createArtifactForApi, {
        userId: auth.userId,
        projectId: id as Id<"projects">,
        runId: body.runId as Id<"projectAiRuns"> | undefined,
        module: body.module,
        kind: body.kind,
        title: body.title,
        summary: body.summary,
        status: body.status,
        contentFormat: body.contentFormat,
        contentMarkdown: body.contentMarkdown,
        contentJson: body.contentJson,
        externalUrl: body.externalUrl,
      });

      return c.json({ artifactId: String(result.artifactId) }, 201);
    },
  );

  // A step result made by the user's AI tool (MCP), in the same shape the Mac screens read.
  app.post(
    "/:id/steps/:step",
    zValidator("param", stepParamSchema, validationHook),
    zValidator("json", saveStepBodySchema, validationHook),
    async (c) => {
      const auth = await authenticateApiKey(c);
      const { id, step } = c.req.valid("param");
      const body = c.req.valid("json");
      if (body.result.projectId !== id) {
        throw new ApiError(400, `result.projectId must be the project in the URL (${id}).`, "project_mismatch");
      }
      const parsed = STEP_RESULT_SCHEMA[step].safeParse(body.result);
      if (!parsed.success) {
        throw new ApiError(400, `The ${step} result doesn't match Stage's format. ${firstIssue(parsed.error.issues)}`, "invalid_step_result", parsed.error.issues);
      }
      try {
        const saved = await c.env.runMutation(internal.projectAi.saveStepForApi, {
          userId: auth.userId,
          projectId: id as Id<"projects">,
          step,
          title: body.title,
          summary: body.summary,
          contentJson: JSON.stringify(parsed.data),
          runId: body.runId,
        });
        return c.json(saved, 201);
      } catch (error) {
        throw stepError(error, "Could not save the step.");
      }
    },
  );

  // The Research form, shared with Stage for Mac's form (MCP get/set_research_inputs).
  app.get("/:id/research/inputs", zValidator("param", projectIdParamSchema, validationHook), async (c) => {
    const auth = await authenticateApiKey(c);
    const { id } = c.req.valid("param");
    return c.json(await c.env.runQuery(internal.projectAi.researchInputsForApi, { userId: auth.userId, projectId: id as Id<"projects"> }));
  });

  app.post(
    "/:id/research/inputs",
    zValidator("param", projectIdParamSchema, validationHook),
    zValidator("json", researchInputsBodySchema, validationHook),
    async (c) => {
      const auth = await authenticateApiKey(c);
      const { id } = c.req.valid("param");
      await c.env.runMutation(internal.projectAi.saveResearchInputsForApi, { userId: auth.userId, projectId: id as Id<"projects">, ...c.req.valid("json") });
      return c.json({ saved: true }, 201);
    },
  );

  // Starts the background job that collects the Research UI pattern screens (Refero/Details), as on Mac
  // (MCP start_research). Returns the run at once; GET /:id/runs/:runId reports its progress.
  app.post("/:id/research/start", zValidator("param", projectIdParamSchema, validationHook), async (c) => {
    const auth = await authenticateApiKey(c);
    const { id } = c.req.valid("param");
    try {
      return c.json(await c.env.runMutation(internal.projectAi.startResearchForApi, { userId: auth.userId, projectId: id as Id<"projects"> }), 202);
    } catch (error) {
      throw stepError(error, "Could not start Research.");
    }
  });

  // Progress of a background job an AI tool started (Research reference collection, moodboard import).
  app.get("/:id/runs/:runId", zValidator("param", runParamSchema, validationHook), async (c) => {
    const auth = await authenticateApiKey(c);
    const { id, runId } = c.req.valid("param");
    try {
      return c.json(await c.env.runQuery(internal.projectAi.runStatusForApi, { userId: auth.userId, projectId: id as Id<"projects">, runId }));
    } catch (error) {
      throw stepError(error, "Could not read the run.");
    }
  });

  // Moodboard images for the project: Refero screens from search_references and/or image links,
  // stored as Stage's own copies (MCP add_to_moodboard).
  app.post(
    "/:id/moodboard/references",
    zValidator("param", projectIdParamSchema, validationHook),
    zValidator("json", moodboardImportBodySchema, validationHook),
    async (c) => {
      const auth = await authenticateApiKey(c);
      const { id } = c.req.valid("param");
      const body = c.req.valid("json");
      try {
        // Starts the import job and returns its run at once; GET /:id/runs/:runId reports the outcome.
        const items = [
          ...body.screens.map((screen) => ({ kind: "refero" as const, screen })),
          ...body.imageUrls.map((url) => ({ kind: "url" as const, url })),
          ...(body.figmaUrl ? [{ kind: "figma" as const, url: body.figmaUrl }] : []),
        ];
        const result = await c.env.runMutation(internal.projectAi.startMoodboardImportForApi, {
          userId: auth.userId,
          projectId: id as Id<"projects">,
          items,
          direction: body.direction,
        });
        return c.json(result, 202);
      } catch (error) {
        throw stepError(error, "Could not add the images.");
      }
    },
  );

  // A style guide for one moodboard direction (MCP save_style_guide).
  app.post(
    "/:id/moodboard/style-guide",
    zValidator("param", projectIdParamSchema, validationHook),
    zValidator("json", styleGuideBodySchema, validationHook),
    async (c) => {
      const auth = await authenticateApiKey(c);
      const { id } = c.req.valid("param");
      const body = c.req.valid("json");
      const parsed = aiStyleGuideSchema.safeParse(body.styleGuide);
      if (!parsed.success) {
        throw new ApiError(400, `The style guide doesn't match Stage's format. ${firstIssue(parsed.error.issues)}`, "invalid_style_guide", parsed.error.issues);
      }
      try {
        const result = await c.env.runMutation(internal.projectAi.saveStyleGuideForApi, {
          userId: auth.userId,
          projectId: id as Id<"projects">,
          direction: body.direction,
          styleGuideJson: JSON.stringify(parsed.data),
        });
        return c.json(result, 201);
      } catch (error) {
        throw stepError(error, "Could not save the style guide.");
      }
    },
  );

  app.get(
    "/:id/phases",
    zValidator("param", projectIdParamSchema, validationHook),
    async (c) => {
      const auth = await authenticateApiKey(c);
      const { id } = c.req.valid("param");
      const phases = await c.env.runQuery(internal.domain.projects.service.listPhasesForApi, {
        userId: auth.userId,
        projectId: id,
      });

      return c.json({ phases });
    },
  );

  app.post(
    "/:id/phases",
    zValidator("param", projectIdParamSchema, validationHook),
    zValidator("json", createPhaseBodySchema, validationHook),
    async (c) => {
      const auth = await authenticateApiKey(c);
      const { id } = c.req.valid("param");
      const body = c.req.valid("json");
      const phase = await c.env.runMutation(internal.domain.projects.service.addPhaseForApi, {
        userId: auth.userId,
        projectId: id,
        name: body.name,
        tasks: body.tasks,
      });

      return c.json({ phase }, 201);
    },
  );

  app.get(
    "/:id",
    zValidator("param", projectIdParamSchema, validationHook),
    async (c) => {
      const auth = await authenticateApiKey(c);
      const { id } = c.req.valid("param");
      const project = await c.env.runQuery(internal.domain.projects.service.getProjectForApi, {
        userId: auth.userId,
        projectId: id,
      });

      return c.json({ project });
    },
  );

  app.post(
    "/",
    zValidator("json", createProjectBodySchema, validationHook),
    async (c) => {
      const auth = await authenticateApiKey(c);
      const body = c.req.valid("json");
      const project = await c.env.runMutation(internal.domain.projects.service.createProjectForApi, {
        userId: auth.userId,
        ...body,
      });

      return c.json({ project }, 201);
    },
  );

  return app;
}
