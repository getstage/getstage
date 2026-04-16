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
  upsertProjectAiContextBodySchema,
} from "../models";
import { jsonError, validationHook } from "../errors";
import type { ApiBindings } from "../types";
import type { Doc, Id } from "../../_generated/dataModel";

export function createProjectRoutes() {
  const app = new Hono<{
    Bindings: ApiBindings;
  }>();

  app.get("/", async (c) => {
    const auth = await authenticateApiKey(c);
    const projects = await c.env.runQuery(internal.domain.projects.service.listProjectsForApi, {
      userId: auth.userId,
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
