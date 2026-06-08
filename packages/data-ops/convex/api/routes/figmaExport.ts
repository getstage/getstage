import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { internal } from "../../_generated/api";
import type { ApiBindings } from "../types";
import { validationHook } from "../errors";

const claimSchema = z.object({
  pairingCode: z.string().trim().min(6).max(64),
  figmaUserId: z.string().trim().min(1),
  documentName: z.string().trim().min(1).max(240),
  editorType: z.enum(["figma", "figjam"]),
});

const heartbeatSchema = z.object({
  claimToken: z.string().trim().min(20),
});

const completeSchema = z.object({
  claimToken: z.string().trim().min(20),
  destinationNodeId: z.string().trim().min(1),
  destinationUrl: z.string().trim().url().optional(),
});

const failSchema = z.object({
  claimToken: z.string().trim().min(20),
  errorMessage: z.string().trim().min(1).max(1000),
});

async function hashSecret(value: string) {
  const bytes = new TextEncoder().encode(value.trim().toUpperCase());
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function createClaimToken() {
  return `${crypto.randomUUID()}${crypto.randomUUID()}`.replaceAll("-", "");
}

export function createFigmaExportRoutes() {
  const app = new Hono<{ Bindings: ApiBindings }>();

  app.post("/claim", zValidator("json", claimSchema, validationHook), async (c) => {
    const input = c.req.valid("json");
    const claimToken = createClaimToken();
    const now = Date.now();
    const result = await c.env.runMutation(
      internal.integrations.contentPlatforms.claimFigmaExportJob,
      {
        pairingCodeHash: await hashSecret(input.pairingCode),
        figmaUserId: input.figmaUserId,
        documentName: input.documentName,
        editorType: input.editorType,
        claimTokenHash: await hashSecret(claimToken),
        claimExpiresAt: now + 10 * 60 * 1000,
        claimedAt: now,
      },
    );

    return c.json({
      ...result,
      claimToken,
      writePlan: JSON.parse(result.writePlanJson) as unknown,
    });
  });

  app.post("/heartbeat", zValidator("json", heartbeatSchema, validationHook), async (c) => {
    const input = c.req.valid("json");
    const now = Date.now();
    const result = await c.env.runMutation(
      internal.integrations.contentPlatforms.heartbeatFigmaExportJob,
      {
        claimTokenHash: await hashSecret(input.claimToken),
        heartbeatAt: now,
        claimExpiresAt: now + 10 * 60 * 1000,
      },
    );
    return c.json(result);
  });

  app.post("/complete", zValidator("json", completeSchema, validationHook), async (c) => {
    const input = c.req.valid("json");
    const result = await c.env.runMutation(
      internal.integrations.contentPlatforms.completeFigmaExportJob,
      {
        claimTokenHash: await hashSecret(input.claimToken),
        destinationNodeId: input.destinationNodeId,
        destinationUrl: input.destinationUrl,
        completedAt: Date.now(),
      },
    );
    return c.json(result);
  });

  app.post("/fail", zValidator("json", failSchema, validationHook), async (c) => {
    const input = c.req.valid("json");
    const result = await c.env.runMutation(
      internal.integrations.contentPlatforms.failFigmaExportJob,
      {
        claimTokenHash: await hashSecret(input.claimToken),
        errorMessage: input.errorMessage,
        failedAt: Date.now(),
      },
    );
    return c.json(result);
  });

  return app;
}
