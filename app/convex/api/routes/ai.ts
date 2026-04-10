import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { internal } from "../../_generated/api";
import { authenticateApiKey } from "../auth";
import { validationHook } from "../errors";
import {
  artifactIdParamSchema,
  createArtifactExportBodySchema,
} from "../models";
import type { ApiBindings } from "../types";
import type { Id } from "../../_generated/dataModel";

export function createAiRoutes() {
  const app = new Hono<{
    Bindings: ApiBindings;
  }>();

  app.post(
    "/artifacts/:id/exports",
    zValidator("param", artifactIdParamSchema, validationHook),
    zValidator("json", createArtifactExportBodySchema, validationHook),
    async (c) => {
      const auth = await authenticateApiKey(c);
      const { id } = c.req.valid("param");
      const body = c.req.valid("json");
      const result = await c.env.runMutation(internal.projectAi.upsertArtifactExportForApi, {
        userId: auth.userId,
        artifactId: id as Id<"projectAiArtifacts">,
        provider: body.provider,
        action: body.action,
        status: body.status,
        destinationLabel: body.destinationLabel,
        destinationUrl: body.destinationUrl,
        errorMessage: body.errorMessage,
        lastSyncedAt: body.lastSyncedAt,
      });

      return c.json({ destinationId: String(result.destinationId) }, 201);
    },
  );

  return app;
}
