import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { internal } from "../../_generated/api";
import { authenticateApiKey } from "../auth";
import { validationHook } from "../errors";
import { claudeHandshakeBodySchema } from "../models";
import type { ApiBindings } from "../types";
import type { Id } from "../../_generated/dataModel";

export function createAgentRoutes() {
  const app = new Hono<{
    Bindings: ApiBindings;
  }>();

  app.post(
    "/connections/claude/handshake",
    zValidator("json", claudeHandshakeBodySchema, validationHook),
    async (c) => {
      const auth = await authenticateApiKey(c);
      const body = c.req.valid("json");
      const result = await c.env.runMutation(internal.agentConnections.handshakeClaudeConnectionForApi, {
        userId: auth.userId,
        apiKeyId: auth.apiKeyId,
        connectionId: body.connectionId as Id<"agentConnections"> | undefined,
        client: body.client,
        capabilities: body.capabilities,
      });

      return c.json(
        {
          connectionId: String(result.connectionId),
          status: result.status,
        },
        201,
      );
    },
  );

  return app;
}
