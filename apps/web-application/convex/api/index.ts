import { Hono } from "hono";
import { cors } from "hono/cors";
import { internal } from "../_generated/api";
import type { ActionCtx } from "../_generated/server";
import { authenticateApiKey } from "./auth";
import { createAgentRoutes } from "./routes/agent";
import { createAiRoutes } from "./routes/ai";
import { handleApiError, jsonError } from "./errors";
import { createMeRoutes } from "./routes/me";
import { createPhaseRoutes } from "./routes/phases";
import { createProjectRoutes } from "./routes/projects";
import { createTaskRoutes } from "./routes/tasks";

export function createApiApp() {
  const app = new Hono<{
    Bindings: ActionCtx;
  }>();

  app.use(
    "/api/v1/*",
    cors({
      origin: "*",
      allowHeaders: ["Authorization", "Content-Type"],
      allowMethods: ["GET", "POST", "OPTIONS"],
      maxAge: 86400,
    }),
  );

  app.onError((error, c) => handleApiError(error, c));
  app.notFound((c) => jsonError(c, 404, "Route not found."));

  app.get("/api/v1", (c) =>
    c.json({
      name: "Stage API",
      version: "v1",
    }),
  );

  app.get("/api/v1/me", async (c) => {
    const auth = await authenticateApiKey(c);
    const user = await c.env.runQuery(internal.viewer.getIdentityForApi, {
      userId: auth.userId,
    });

    return c.json({ user });
  });

  app.route("/api/v1/agent", createAgentRoutes());
  app.route("/api/v1/ai", createAiRoutes());
  app.route("/api/v1/projects", createProjectRoutes());
  app.route("/api/v1/phases", createPhaseRoutes());
  app.route("/api/v1/tasks", createTaskRoutes());
  app.route("/api/v1/me", createMeRoutes());

  return app;
}

export const apiApp = createApiApp();
