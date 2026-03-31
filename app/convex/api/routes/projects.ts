import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { internal } from "../../_generated/api";
import { authenticateApiKey } from "../auth";
import {
  createPhaseBodySchema,
  generateDesignBodySchema,
  createProjectBodySchema,
  generateProjectBodySchema,
  projectIdParamSchema,
} from "../models";
import { validationHook } from "../errors";
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
    zValidator("json", generateProjectBodySchema, validationHook),
    async (c) => {
      const auth = await authenticateApiKey(c);
      const body = c.req.valid("json");
      const project = await c.env.runAction(internal.domain.projects.generation.generateProjectForApi, {
        userId: auth.userId,
        description: body.description,
        model: body.model,
      });

      return c.json({ project }, 201);
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
