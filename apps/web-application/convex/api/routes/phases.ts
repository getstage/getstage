import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { internal } from "../../_generated/api";
import { authenticateApiKey } from "../auth";
import { validationHook } from "../errors";
import { createTaskBodySchema, phaseIdParamSchema } from "../models";
import type { ApiBindings } from "../types";

export function createPhaseRoutes() {
  const app = new Hono<{
    Bindings: ApiBindings;
  }>();

  app.get(
    "/:id/tasks",
    zValidator("param", phaseIdParamSchema, validationHook),
    async (c) => {
      const auth = await authenticateApiKey(c);
      const { id } = c.req.valid("param");
      const tasks = await c.env.runQuery(internal.domain.projects.service.listTasksForApi, {
        userId: auth.userId,
        phaseId: id,
      });

      return c.json({ tasks });
    },
  );

  app.post(
    "/:id/tasks",
    zValidator("param", phaseIdParamSchema, validationHook),
    zValidator("json", createTaskBodySchema, validationHook),
    async (c) => {
      const auth = await authenticateApiKey(c);
      const { id } = c.req.valid("param");
      const body = c.req.valid("json");
      const task = await c.env.runMutation(internal.domain.projects.service.addTaskForApi, {
        userId: auth.userId,
        phaseId: id,
        title: body.title,
      });

      return c.json({ task }, 201);
    },
  );

  return app;
}
