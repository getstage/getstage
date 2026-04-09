import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { internal } from "../../_generated/api";
import { authenticateApiKey } from "../auth";
import {
  createDesignUploadUrlBodySchema,
  createPhaseBodySchema,
  generateDesignBodySchema,
  createProjectBodySchema,
  importProjectPlanBodySchema,
  projectIdParamSchema,
  syncProjectDesignsBodySchema,
  upsertDesignConnectionBodySchema,
} from "../models";
import { jsonError, validationHook } from "../errors";
import type { ApiBindings } from "../types";

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
    "/:id/design-connections",
    zValidator("param", projectIdParamSchema, validationHook),
    async (c) => {
      const auth = await authenticateApiKey(c);
      const { id } = c.req.valid("param");
      const connections = await c.env.runQuery(internal.integrations.stitch.listDesignConnectionsForApi, {
        userId: auth.userId,
        projectId: id,
      });

      return c.json({ connections });
    },
  );

  app.post(
    "/:id/design-connections",
    zValidator("param", projectIdParamSchema, validationHook),
    zValidator("json", upsertDesignConnectionBodySchema, validationHook),
    async (c) => {
      const auth = await authenticateApiKey(c);
      const { id } = c.req.valid("param");
      const body = c.req.valid("json");
      const connection = await c.env.runAction(internal.integrations.stitch.verifyAndUpsertDesignConnectionForApi, {
        userId: auth.userId,
        projectId: id,
        externalProjectUrl: body.externalProjectUrl,
        title: body.title,
      });

      return c.json({ connection }, 201);
    },
  );

  app.get(
    "/:id/designs",
    zValidator("param", projectIdParamSchema, validationHook),
    async (c) => {
      const auth = await authenticateApiKey(c);
      const { id } = c.req.valid("param");
      const designs = await c.env.runQuery(internal.integrations.stitch.listByProjectForApi, {
        userId: auth.userId,
        projectId: id,
      });

      return c.json({ designs });
    },
  );

  app.post(
    "/:id/designs/upload-url",
    zValidator("param", projectIdParamSchema, validationHook),
    zValidator("json", createDesignUploadUrlBodySchema, validationHook),
    async (c) => {
      const auth = await authenticateApiKey(c);
      const { id } = c.req.valid("param");
      const body = c.req.valid("json");

      await c.env.runQuery(internal.domain.projects.service.getProjectReferenceForApi, {
        userId: auth.userId,
        projectId: id,
      });

      const upload = await c.env.runMutation(internal.r2.generateUploadUrlForApi, {
        userId: auth.userId,
        purpose: "generated-design",
        fileName: body.fileName,
        fileSize: body.fileSize,
        mimeType: body.mimeType,
      });

      const uploadUrl =
        typeof upload.uploadUrl === "string" ? upload.uploadUrl : upload.uploadUrl.url;

      return c.json(
        {
          uploadUrl,
          r2ObjectKey: upload.key,
        },
        201,
      );
    },
  );

  app.post(
    "/:id/designs/sync",
    zValidator("param", projectIdParamSchema, validationHook),
    zValidator("json", syncProjectDesignsBodySchema, validationHook),
    async (c) => {
      const auth = await authenticateApiKey(c);
      const { id } = c.req.valid("param");
      const body = c.req.valid("json");
      const result = await c.env.runAction(internal.integrations.stitch.verifyAndSyncProjectDesignsForApi, {
        userId: auth.userId,
        projectId: id,
        externalProjectUrl: body.externalProjectUrl,
        externalProjectId: body.externalProjectId,
        title: body.title,
        screens: body.screens,
      });

      return c.json(result, 201);
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
    "/:id/generate-design",
    zValidator("param", projectIdParamSchema, validationHook),
    zValidator("json", generateDesignBodySchema, validationHook),
    async (c) => {
      const auth = await authenticateApiKey(c);
      const { id } = c.req.valid("param");
      const body = c.req.valid("json");
      const design = await c.env.runAction(internal.integrations.stitch.generateDesignForApi, {
        userId: auth.userId,
        projectId: id,
        prompt: body.prompt,
        phaseId: body.phaseId,
        deviceType: body.deviceType,
        modelId: body.modelId,
      });

      return c.json({ design }, 201);
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
