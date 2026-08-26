import { z } from "zod";
import { v } from "convex/values";
import { internal } from "../../_generated/api";
import type { ActionCtx, MutationCtx } from "../../_generated/server";
import { getEnv } from "../../helpers/env";

export const upsertCatalogComponentArgs = {
  componentId: v.string(),
  library: v.string(),
  name: v.string(),
  kind: v.string(),
  sourceRevision: v.string(),
  sourceBundleKey: v.string(),
};

export const upsertCatalogComponentReturns = v.object({
  componentId: v.string(),
  created: v.boolean(),
});

export type UpsertCatalogComponentArgs = {
  componentId: string;
  library: string;
  name: string;
  kind: string;
  sourceRevision: string;
  sourceBundleKey: string;
};

export async function upsertCatalogComponentHandler(
  ctx: MutationCtx,
  args: UpsertCatalogComponentArgs,
) {
  const existing = await ctx.db
    .query("wireframeCatalogComponents")
    .withIndex("by_componentId", (q) => q.eq("componentId", args.componentId))
    .unique();
  const component = {
    ...args,
    verified: existing?.verified ?? false,
    updatedAt: Date.now(),
  };

  if (existing) {
    await ctx.db.replace(existing._id, component);
    return { componentId: args.componentId, created: false };
  }

  await ctx.db.insert("wireframeCatalogComponents", component);
  return { componentId: args.componentId, created: true };
}

const catalogComponent = z
  .object({
    componentId: z.string().min(1),
    library: z.string().min(1),
    name: z.string().min(1),
    kind: z.string().min(1),
    sourceRevision: z.string().min(1),
    sourceBundleKey: z.string().min(1),
  })
  .strict();

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function ingestCatalogComponentHandler(ctx: ActionCtx, request: Request) {
  const expectedToken = getEnv("WIREFRAMES_INGEST_TOKEN");
  if (!expectedToken) {
    return json(503, { error: "Catalog ingest is not configured." });
  }
  if (request.headers.get("x-ingest-token") !== expectedToken) {
    return json(401, { error: "Unauthorized." });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return json(400, { error: "Request body must be valid JSON." });
  }

  const parsed = catalogComponent.safeParse(payload);
  if (!parsed.success) {
    return json(400, {
      error: "Invalid catalog component.",
      issues: parsed.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
    });
  }

  const result = await ctx.runMutation(
    internal.wireframeCatalog.upsertCatalogComponent,
    parsed.data,
  );
  return json(200, { ok: true, ...result });
}
