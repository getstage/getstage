import { z } from "zod";
import { v } from "convex/values";
import { makeFunctionReference } from "convex/server";
import { internal } from "../../_generated/api";
import type { Doc, Id } from "../../_generated/dataModel";
import type { ActionCtx, MutationCtx, QueryCtx } from "../../_generated/server";
import { getEnv } from "../../helpers/env";
import { buildCatalogSearchText, fetchCatalogSource } from "./source";
import {
  CATALOG_EMBEDDING_DIMENSION,
  catalogScopes,
} from "./embedding";

const embedCatalogText = makeFunctionReference<
  "action",
  {
    value: string;
    correlationId: string;
    operation: "index" | "search";
  },
  { embedding: number[]; tokens: number }
>("wireframeCatalogEmbeddings:embedCatalogText");

type CatalogDoc = Doc<"wireframeCatalogComponents">;
type CatalogEmbeddingDoc = Doc<"wireframeCatalogEmbeddings">;
type CatalogCandidate = {
  componentId: string;
  library: string;
  name: string;
  kind: string;
  runtime: "client" | "universal";
  sourceRevision: string;
  score: number;
};

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

  if (existing) {
    const sourceUnchanged =
      existing.sourceRevision === args.sourceRevision &&
      existing.sourceBundleKey === args.sourceBundleKey;
    if (sourceUnchanged) {
      await ctx.db.patch(existing._id, { ...args, updatedAt: Date.now() });
    } else {
      const indexed = await ctx.db
        .query("wireframeCatalogEmbeddings")
        .withIndex("by_componentId", (q) =>
          q.eq("componentId", args.componentId),
        )
        .unique();
      if (indexed) await ctx.db.delete(indexed._id);
      await ctx.db.replace(existing._id, {
        ...args,
        verified: false,
        embeddingReady: false,
        embeddingIndexAttempts: 0,
        updatedAt: Date.now(),
      });
    }
    return { componentId: args.componentId, created: false };
  }

  await ctx.db.insert("wireframeCatalogComponents", {
    ...args,
    verified: false,
    embeddingReady: false,
    embeddingIndexAttempts: 0,
    updatedAt: Date.now(),
  });
  return { componentId: args.componentId, created: true };
}

export const getCatalogComponentArgs = { componentId: v.string() };

export async function getCatalogComponentHandler(
  ctx: QueryCtx,
  args: { componentId: string },
): Promise<CatalogDoc | null> {
  return ctx.db
    .query("wireframeCatalogComponents")
    .withIndex("by_componentId", (q) => q.eq("componentId", args.componentId))
    .unique();
}

export const getCatalogComponentsArgs = { componentIds: v.array(v.string()) };

export async function getCatalogComponentsHandler(
  ctx: QueryCtx,
  args: { componentIds: string[] },
): Promise<CatalogDoc[]> {
  if (args.componentIds.length > 48)
    throw new Error("Too many catalog component IDs.");
  const rows = await Promise.all(
    args.componentIds.map((componentId) =>
      getCatalogComponentHandler(ctx, { componentId }),
    ),
  );
  return rows.filter((row) => row !== null);
}

export const listCatalogComponentsForIndexingArgs = {
  limit: v.optional(v.number()),
};

export async function listCatalogComponentsForIndexingHandler(
  ctx: QueryCtx,
  args: { limit?: number },
): Promise<CatalogDoc[]> {
  const limit = Math.max(1, Math.min(Math.floor(args.limit ?? 8), 24));
  const [missing, failed] = await Promise.all([
    ctx.db
      .query("wireframeCatalogComponents")
      .withIndex("by_embeddingReady", (q) =>
        q.eq("embeddingReady", undefined),
      )
      .collect(),
    ctx.db
      .query("wireframeCatalogComponents")
      .withIndex("by_embeddingReady", (q) => q.eq("embeddingReady", false))
      .collect(),
  ]);
  return [...missing, ...failed]
    .filter((row) => (row.embeddingIndexAttempts ?? 0) < 3)
    .slice(0, limit);
}

export const getCatalogEmbeddingsArgs = {
  embeddingIds: v.array(v.id("wireframeCatalogEmbeddings")),
};

export async function getCatalogEmbeddingsHandler(
  ctx: QueryCtx,
  args: { embeddingIds: Id<"wireframeCatalogEmbeddings">[] },
): Promise<CatalogEmbeddingDoc[]> {
  if (args.embeddingIds.length > 48)
    throw new Error("Too many catalog embedding IDs.");
  const rows = await Promise.all(args.embeddingIds.map((id) => ctx.db.get(id)));
  return rows.filter((row) => row !== null);
}

export const upsertCatalogEmbeddingArgs = {
  componentId: v.string(),
  sourceRevision: v.string(),
  runtime: v.union(v.literal("client"), v.literal("universal")),
  embedding: v.array(v.float64()),
};

export async function upsertCatalogEmbeddingHandler(
  ctx: MutationCtx,
  args: {
    componentId: string;
    sourceRevision: string;
    runtime: "client" | "universal";
    embedding: number[];
  },
): Promise<{ updated: boolean }> {
  if (args.embedding.length !== CATALOG_EMBEDDING_DIMENSION) {
    throw new Error("Catalog embedding has an invalid dimension.");
  }
  const row = await getCatalogComponentHandler(ctx, {
    componentId: args.componentId,
  });
  if (!row || row.sourceRevision !== args.sourceRevision)
    return { updated: false };

  const existing = await ctx.db
    .query("wireframeCatalogEmbeddings")
    .withIndex("by_componentId", (q) =>
      q.eq("componentId", args.componentId),
    )
    .unique();
  const embedding = {
    componentId: args.componentId,
    sourceRevision: args.sourceRevision,
    scope: `${row.library}:${args.runtime}`,
    embedding: args.embedding,
    updatedAt: Date.now(),
  };
  if (existing) await ctx.db.replace(existing._id, embedding);
  else await ctx.db.insert("wireframeCatalogEmbeddings", embedding);

  await ctx.db.patch(row._id, {
    verified: true,
    runtime: args.runtime,
    verifiedAt: Date.now(),
    verificationError: undefined,
    embeddingReady: true,
    embeddingIndexAttempts: 0,
    embeddingIndexedRevision: args.sourceRevision,
    ragIndexAttempts: undefined,
    ragEntryId: undefined,
    ragIndexedRevision: undefined,
    updatedAt: Date.now(),
  });
  return { updated: true };
}

export const markCatalogIndexFailureArgs = {
  componentId: v.string(),
  sourceRevision: v.string(),
  error: v.string(),
};

export async function markCatalogIndexFailureHandler(
  ctx: MutationCtx,
  args: { componentId: string; sourceRevision: string; error: string },
): Promise<{ updated: boolean }> {
  const row = await getCatalogComponentHandler(ctx, {
    componentId: args.componentId,
  });
  if (!row || row.sourceRevision !== args.sourceRevision)
    return { updated: false };
  await ctx.db.patch(row._id, {
    verified: false,
    embeddingReady: false,
    embeddingIndexAttempts: Math.min(
      (row.embeddingIndexAttempts ?? 0) + 1,
      3,
    ),
    verificationError: args.error.slice(0, 1_000),
    updatedAt: Date.now(),
  });
  return { updated: true };
}

function correlationId(value: string | undefined) {
  const candidate = value?.trim();
  return candidate && /^[a-zA-Z0-9:_-]{1,128}$/.test(candidate)
    ? candidate
    : crypto.randomUUID();
}

export const indexCatalogComponentArgs = {
  componentId: v.string(),
  correlationId: v.optional(v.string()),
};

export async function indexCatalogComponentHandler(
  ctx: ActionCtx,
  args: { componentId: string; correlationId?: string },
): Promise<{ componentId: string; indexed: true; tokens: number }> {
  const row = await ctx.runQuery(
    internal.wireframeCatalog.getCatalogComponent,
    {
      componentId: args.componentId,
    },
  );
  if (!row) throw new Error("Catalog component not found.");

  try {
    const source = await fetchCatalogSource(row.sourceBundleKey);
    const searchText = buildCatalogSearchText(row, source);
    const { embedding, tokens } = await ctx.runAction(embedCatalogText, {
      value: searchText,
      correlationId: correlationId(args.correlationId),
      operation: "index",
    });
    const verification = await ctx.runMutation(
      internal.wireframeCatalog.upsertCatalogEmbedding,
      {
        componentId: row.componentId,
        sourceRevision: row.sourceRevision,
        runtime: source.runtime,
        embedding,
      },
    );
    if (!verification.updated) {
      throw new Error("Catalog source changed while it was being indexed.");
    }
    return { componentId: row.componentId, indexed: true, tokens };
  } catch (error) {
    await ctx.runMutation(internal.wireframeCatalog.markCatalogIndexFailure, {
      componentId: row.componentId,
      sourceRevision: row.sourceRevision,
      error:
        error instanceof Error ? error.message : "Catalog indexing failed.",
    });
    throw error;
  }
}

export const indexCatalogBatchArgs = {
  limit: v.optional(v.number()),
  continue: v.optional(v.boolean()),
};

export async function indexCatalogBatchHandler(
  ctx: ActionCtx,
  args: { limit?: number; continue?: boolean },
): Promise<{
  results: Array<{ componentId: string; indexed: boolean; error?: string }>;
  scheduledNextBatch: boolean;
}> {
  const limit = Math.max(1, Math.min(Math.floor(args.limit ?? 8), 24));
  const rows = await ctx.runQuery(
    internal.wireframeCatalog.listCatalogComponentsForIndexing,
    { limit },
  );
  const results: Array<{
    componentId: string;
    indexed: boolean;
    error?: string;
  }> = [];
  for (const row of rows) {
    try {
      await indexCatalogComponentHandler(ctx, {
        componentId: row.componentId,
        correlationId: crypto.randomUUID(),
      });
      results.push({ componentId: row.componentId, indexed: true });
    } catch (error) {
      results.push({
        componentId: row.componentId,
        indexed: false,
        error:
          error instanceof Error
            ? error.message.slice(0, 300)
            : "Catalog indexing failed.",
      });
    }
  }
  const scheduledNextBatch = args.continue === true && rows.length === limit;
  if (scheduledNextBatch) {
    await ctx.scheduler.runAfter(
      0,
      internal.wireframeCatalog.indexCatalogBatch,
      { limit, continue: true },
    );
  }
  return { results, scheduledNextBatch };
}

export const searchCatalogArgs = {
  query: v.string(),
  libraries: v.array(v.string()),
  runtime: v.union(v.literal("client"), v.literal("universal")),
  limit: v.optional(v.number()),
  correlationId: v.optional(v.string()),
};

export async function searchCatalogHandler(
  ctx: ActionCtx,
  args: {
    query: string;
    libraries: string[];
    runtime: "client" | "universal";
    limit?: number;
    correlationId?: string;
  },
): Promise<{ candidates: CatalogCandidate[]; embeddingTokens: number }> {
  if (!(await ctx.auth.getUserIdentity())) throw new Error("Not authenticated");
  const query = args.query.trim();
  if (!query || query.length > 2_000)
    throw new Error("Catalog query must be 1-2000 characters.");
  const libraries = [
    ...new Set(args.libraries.map((value) => value.trim()).filter(Boolean)),
  ];
  if (libraries.length === 0 || libraries.length > 8) {
    throw new Error("Select between 1 and 8 component libraries.");
  }
  const limit = Math.max(1, Math.min(Math.floor(args.limit ?? 8), 12));
  const { embedding, tokens } = await ctx.runAction(embedCatalogText, {
    value: query,
    correlationId: correlationId(args.correlationId),
    operation: "search",
  });
  const scopes = catalogScopes(libraries, args.runtime);
  const matches = await ctx.vectorSearch(
    "wireframeCatalogEmbeddings",
    "by_embedding",
    {
      vector: embedding,
      filter: (q) => q.or(...scopes.map((scope) => q.eq("scope", scope))),
      limit: Math.min(limit * 4, 48),
    },
  );
  const embeddingRows: CatalogEmbeddingDoc[] = await ctx.runQuery(
    internal.wireframeCatalog.getCatalogEmbeddings,
    { embeddingIds: matches.map((match) => match._id) },
  );
  const componentIds = embeddingRows.map((row) => row.componentId);
  const scoreByEmbeddingId = new Map(
    matches.map((match) => [match._id, match._score]),
  );
  const currentRows: CatalogDoc[] = await ctx.runQuery(
    internal.wireframeCatalog.getCatalogComponents,
    { componentIds },
  );
  const currentById = new Map<string, CatalogDoc>(
    currentRows.map((row) => [row.componentId, row]),
  );

  const candidates = embeddingRows.flatMap((indexed): CatalogCandidate[] => {
    const current = currentById.get(indexed.componentId);
    const score = scoreByEmbeddingId.get(indexed._id) ?? 0;
    if (
      score < 0.35 ||
      !current?.verified ||
      current.embeddingReady !== true ||
      current.embeddingIndexedRevision !== current.sourceRevision ||
      indexed.sourceRevision !== current.sourceRevision ||
      !current.runtime
    ) {
      return [];
    }
    return [
      {
        componentId: current.componentId,
        library: current.library,
        name: current.name,
        kind: current.kind,
        runtime: current.runtime,
        sourceRevision: current.sourceRevision,
        score,
      },
    ];
  });
  return { candidates: candidates.slice(0, limit), embeddingTokens: tokens };
}

export const loadCatalogSourceArgs = {
  componentId: v.string(),
  sourceRevision: v.string(),
};

export async function loadCatalogSourceHandler(
  ctx: ActionCtx,
  args: { componentId: string; sourceRevision: string },
): Promise<{
  componentId: string;
  library: string;
  name: string;
  kind: string;
  runtime: "client" | "universal";
  sourceRevision: string;
  files: Array<{ path: string; content: string }>;
  css?: string;
  dependencies: string[];
  registryDependencies: string[];
}> {
  if (!(await ctx.auth.getUserIdentity())) throw new Error("Not authenticated");
  const row = await ctx.runQuery(
    internal.wireframeCatalog.getCatalogComponent,
    {
      componentId: args.componentId,
    },
  );
  if (
    !row?.verified ||
    row.embeddingReady !== true ||
    row.sourceRevision !== args.sourceRevision ||
    row.embeddingIndexedRevision !== row.sourceRevision
  ) {
    throw new Error("Catalog component is not available at this revision.");
  }
  const source = await fetchCatalogSource(row.sourceBundleKey);
  return {
    componentId: row.componentId,
    library: row.library,
    name: row.name,
    kind: row.kind,
    runtime: source.runtime,
    sourceRevision: row.sourceRevision,
    files: source.files,
    ...(source.css ? { css: source.css } : {}),
    dependencies: source.dependencies,
    registryDependencies: source.registryDependencies,
  };
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

export async function ingestCatalogComponentHandler(
  ctx: ActionCtx,
  request: Request,
) {
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
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  const result = await ctx.runMutation(
    internal.wireframeCatalog.upsertCatalogComponent,
    parsed.data,
  );
  return json(200, { ok: true, ...result });
}
