import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { internal } from "../../_generated/api";
import { authenticateApiKey } from "../auth";
import { validationHook } from "../errors";
import { taskIdParamSchema } from "../models";
import type { ApiBindings } from "../types";

export function createTaskRoutes() {
  const app = new Hono<{
    Bindings: ApiBindings;
  }>();

  app.get(
    "/:id",
    zValidator("param", taskIdParamSchema, validationHook),
    async (c) => {
      const auth = await authenticateApiKey(c);
      const { id } = c.req.valid("param");
      const task = await c.env.runQuery(internal.domain.projects.service.getTaskForApi, {
        userId: auth.userId,
        taskId: id,
      });

      return c.json({ task });
    },
  );

  app.post(
    "/:id/toggle",
    zValidator("param", taskIdParamSchema, validationHook),
    async (c) => {
      const auth = await authenticateApiKey(c);
      const { id } = c.req.valid("param");
      const task = await c.env.runMutation(internal.domain.projects.service.toggleTaskForApi, {
        userId: auth.userId,
        taskId: id,
      });

      return c.json({ task });
    },
  );

  return app;
}
