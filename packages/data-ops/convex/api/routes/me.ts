import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { internal } from "../../_generated/api";
import { authenticateApiKey } from "../auth";
import { validationHook } from "../errors";
import type { ApiBindings } from "../types";

const userTasksQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(200).optional(),
});

/**
 * Routes scoped to the currently authenticated user.
 *
 * Mounted under `/api/v1/me`. Existing `/api/v1/me` (the identity endpoint)
 * stays in `convex/api/index.ts`; everything else lives here.
 */
export function createMeRoutes() {
  const app = new Hono<{
    Bindings: ApiBindings;
  }>();

  app.get(
    "/tasks",
    zValidator("query", userTasksQuerySchema, validationHook),
    async (c) => {
      const auth = await authenticateApiKey(c);
      const { limit } = c.req.valid("query");
      const tasks = await c.env.runQuery(
        internal.domain.projects.service.listUserTasksForApi,
        { userId: auth.userId, limit },
      );

      return c.json({ tasks });
    },
  );

  return app;
}
