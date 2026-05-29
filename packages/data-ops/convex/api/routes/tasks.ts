import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { internal } from "../../_generated/api";
import { authenticateApiKey } from "../auth";
import { validationHook } from "../errors";
import { taskIdParamSchema } from "../models";
import type { ApiBindings } from "../types";

const taskPriorityValueSchema = z.enum(["low", "medium", "high"]);

const createTaskBodySchema = z.object({
  projectId: z.string().min(1),
  title: z.string().trim().min(1, "Task title is required"),
  priority: taskPriorityValueSchema.optional(),
  content: z.string().optional(),
});

const setPriorityBodySchema = z.object({
  priority: taskPriorityValueSchema.nullable(),
});

export function createTaskRoutes() {
  const app = new Hono<{
    Bindings: ApiBindings;
  }>();

  app.post(
    "/",
    zValidator("json", createTaskBodySchema, validationHook),
    async (c) => {
      const auth = await authenticateApiKey(c);
      const body = c.req.valid("json");
      const task = await c.env.runMutation(
        internal.domain.projects.service.createProjectTaskForApi,
        {
          userId: auth.userId,
          projectId: body.projectId,
          title: body.title,
          priority: body.priority,
          content: body.content,
        },
      );
      return c.json({ task }, 201);
    },
  );

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

  app.delete(
    "/:id",
    zValidator("param", taskIdParamSchema, validationHook),
    async (c) => {
      const auth = await authenticateApiKey(c);
      const { id } = c.req.valid("param");
      const result = await c.env.runMutation(internal.domain.projects.service.deleteTaskForApi, {
        userId: auth.userId,
        taskId: id,
      });
      return c.json(result);
    },
  );

  app.post(
    "/:id/priority",
    zValidator("param", taskIdParamSchema, validationHook),
    zValidator("json", setPriorityBodySchema, validationHook),
    async (c) => {
      const auth = await authenticateApiKey(c);
      const { id } = c.req.valid("param");
      const { priority } = c.req.valid("json");
      const task = await c.env.runMutation(internal.domain.projects.service.setTaskPriorityForApi, {
        userId: auth.userId,
        taskId: id,
        priority,
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
