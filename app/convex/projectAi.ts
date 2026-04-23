import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { requireProjectAccess } from "./_helpers";
import type { Id } from "./_generated/dataModel";
import { attachTrackedR2Asset, deleteOldR2Asset, resolveAssetUrl } from "./r2";

const aiModule = v.union(
  v.literal("research"),
  v.literal("strategy"),
  v.literal("flows"),
  v.literal("moodboard"),
  v.literal("generate"),
  v.literal("delivery"),
);

const aiRunStatus = v.union(
  v.literal("draft"),
  v.literal("running"),
  v.literal("completed"),
  v.literal("failed"),
  v.literal("needs_input"),
);

const aiArtifactStatus = v.union(
  v.literal("draft"),
  v.literal("ready"),
  v.literal("approved"),
  v.literal("superseded"),
  v.literal("failed"),
);

const aiContentFormat = v.union(
  v.literal("markdown"),
  v.literal("json"),
  v.literal("link_set"),
);

const exportProvider = v.union(v.literal("notion"), v.literal("figma"));

const exportStatus = v.union(
  v.literal("requested"),
  v.literal("in_progress"),
  v.literal("completed"),
  v.literal("failed"),
);

function now() {
  return Date.now();
}

function normalizeOptional(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeList(values: string[]) {
  return Array.from(
    new Set(
      values
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  );
}

async function requireProjectForApi(
  ctx: any,
  userId: Id<"users">,
  projectId: Id<"projects">,
) {
  const project = await ctx.db.get(projectId);
  if (!project) {
    throw new Error("Project not found.");
  }
  if (project.userId !== userId) {
    throw new Error("Not authorized.");
  }
  return project;
}

async function getContextRecord(ctx: any, projectId: Id<"projects">) {
  return ctx.db
    .query("projectAiContexts")
    .withIndex("by_project", (q: any) => q.eq("projectId", projectId))
    .unique();
}

async function getArtifactRecord(ctx: any, artifactId: Id<"projectAiArtifacts">) {
  const artifact = await ctx.db.get(artifactId);
  if (!artifact) {
    throw new Error("Artifact not found.");
  }
  return artifact;
}

async function getRunRecord(ctx: any, runId: Id<"projectAiRuns">) {
  const run = await ctx.db.get(runId);
  if (!run) {
    throw new Error("Run not found.");
  }
  return run;
}

async function listDestinationsForArtifacts(ctx: any, artifactIds: Id<"projectAiArtifacts">[]) {
  const results = new Map<string, any[]>();
  await Promise.all(
    artifactIds.map(async (artifactId) => {
      const destinations = await ctx.db
        .query("artifactDestinations")
        .withIndex("by_artifact", (q: any) => q.eq("artifactId", artifactId))
        .collect();
      results.set(String(artifactId), destinations.sort((a: any, b: any) => b.updatedAt - a.updatedAt));
    }),
  );
  return results;
}

async function upsertContextRecord(
  ctx: any,
  args: {
    userId: Id<"users">;
    projectId: Id<"projects">;
    clientWebsite?: string;
    competitorUrls: string[];
    referenceUrls: string[];
    brief?: string;
    briefAttachmentName?: string | null;
    briefAttachmentR2ObjectKey?: string | null;
    notes?: string;
  },
) {
  const existing = await getContextRecord(ctx, args.projectId);
  const timestamp = now();
  const nextBriefAttachmentKey = normalizeOptional(args.briefAttachmentR2ObjectKey);
  const payload = {
    clientWebsite: normalizeOptional(args.clientWebsite),
    competitorUrls: normalizeList(args.competitorUrls),
    referenceUrls: normalizeList(args.referenceUrls),
    brief: normalizeOptional(args.brief),
    briefAttachmentName: normalizeOptional(args.briefAttachmentName),
    briefAttachmentR2ObjectKey: nextBriefAttachmentKey,
    notes: normalizeOptional(args.notes),
    updatedAt: timestamp,
  };

  if (
    existing?.briefAttachmentR2ObjectKey &&
    existing.briefAttachmentR2ObjectKey !== nextBriefAttachmentKey
  ) {
    await deleteOldR2Asset(ctx, existing.briefAttachmentR2ObjectKey);
  }

  if (nextBriefAttachmentKey && existing?.briefAttachmentR2ObjectKey !== nextBriefAttachmentKey) {
    await attachTrackedR2Asset(ctx, { key: nextBriefAttachmentKey });
  }

  if (existing) {
    await ctx.db.patch(existing._id, payload);
    return existing._id;
  }

  return ctx.db.insert("projectAiContexts", {
    userId: args.userId,
    projectId: args.projectId,
    createdAt: timestamp,
    ...payload,
  });
}

async function createRunRecord(
  ctx: any,
  args: {
    userId: Id<"users">;
    projectId: Id<"projects">;
    connectionId?: Id<"agentConnections">;
    module: "research" | "strategy" | "generate" | "delivery";
    title: string;
    status: "draft" | "running" | "completed" | "failed" | "needs_input";
    trigger: "user" | "agent";
    inputSummary?: string;
    externalRunId?: string;
  },
) {
  const timestamp = now();
  return ctx.db.insert("projectAiRuns", {
    userId: args.userId,
    projectId: args.projectId,
    connectionId: args.connectionId,
    module: args.module,
    title: args.title.trim(),
    status: args.status,
    trigger: args.trigger,
    inputSummary: normalizeOptional(args.inputSummary),
    externalRunId: normalizeOptional(args.externalRunId),
    startedAt: timestamp,
    updatedAt: timestamp,
  });
}

async function createArtifactRecord(
  ctx: any,
  args: {
    userId: Id<"users">;
    projectId: Id<"projects">;
    runId?: Id<"projectAiRuns">;
    module: "research" | "strategy" | "generate" | "delivery";
    kind: string;
    title: string;
    summary?: string;
    status: "draft" | "ready" | "approved" | "superseded" | "failed";
    contentFormat: "markdown" | "json" | "link_set";
    contentMarkdown?: string;
    contentJson?: string;
    externalUrl?: string;
  },
) {
  const timestamp = now();
  const artifactId = await ctx.db.insert("projectAiArtifacts", {
    userId: args.userId,
    projectId: args.projectId,
    runId: args.runId,
    module: args.module,
    kind: args.kind.trim(),
    title: args.title.trim(),
    summary: normalizeOptional(args.summary),
    status: args.status,
    contentFormat: args.contentFormat,
    contentMarkdown: normalizeOptional(args.contentMarkdown),
    contentJson: normalizeOptional(args.contentJson),
    externalUrl: normalizeOptional(args.externalUrl),
    createdAt: timestamp,
    updatedAt: timestamp,
    approvedAt: args.status === "approved" ? timestamp : undefined,
  });

  if (args.runId) {
    await ctx.db.patch(args.runId, {
      status: args.status === "failed" ? "failed" : "completed",
      errorMessage: args.status === "failed" ? normalizeOptional(args.summary) : undefined,
      completedAt: timestamp,
      updatedAt: timestamp,
    });
  }

  return artifactId;
}

export const getContext = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const { user, project } = await requireProjectAccess(ctx, args.projectId);
    const record = await getContextRecord(ctx, args.projectId);

    return {
      projectId: String(project._id),
      userId: String(user._id),
      clientWebsite: record?.clientWebsite ?? "",
      competitorUrls: record?.competitorUrls ?? [],
      referenceUrls: record?.referenceUrls ?? [],
      brief: record?.brief ?? "",
      briefAttachmentName: record?.briefAttachmentName ?? null,
      briefAttachmentR2ObjectKey: record?.briefAttachmentR2ObjectKey ?? null,
      briefAttachmentUrl: await resolveAssetUrl(record?.briefAttachmentR2ObjectKey ?? null),
      notes: record?.notes ?? "",
      updatedAt: record?.updatedAt ?? null,
    };
  },
});

export const upsertContext = mutation({
  args: {
    projectId: v.id("projects"),
    clientWebsite: v.optional(v.string()),
    competitorUrls: v.array(v.string()),
    referenceUrls: v.array(v.string()),
    brief: v.optional(v.string()),
    briefAttachmentName: v.optional(v.union(v.string(), v.null())),
    briefAttachmentR2ObjectKey: v.optional(v.union(v.string(), v.null())),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireProjectAccess(ctx, args.projectId);
    await upsertContextRecord(ctx, {
      userId: user._id,
      projectId: args.projectId,
      clientWebsite: args.clientWebsite,
      competitorUrls: args.competitorUrls,
      referenceUrls: args.referenceUrls,
      brief: args.brief,
      briefAttachmentName: args.briefAttachmentName,
      briefAttachmentR2ObjectKey: args.briefAttachmentR2ObjectKey,
      notes: args.notes,
    });

    return { saved: true, updatedAt: now() };
  },
});

export const listRuns = query({
  args: {
    projectId: v.id("projects"),
    module: v.optional(aiModule),
  },
  handler: async (ctx, args) => {
    await requireProjectAccess(ctx, args.projectId);
    const runs = await ctx.db
      .query("projectAiRuns")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    return runs
      .filter((run) => !args.module || run.module === args.module)
      .sort((a, b) => b.startedAt - a.startedAt)
      .map((run) => ({
        id: String(run._id),
        projectId: String(run.projectId),
        connectionId: run.connectionId ? String(run.connectionId) : null,
        module: run.module,
        title: run.title,
        status: run.status,
        trigger: run.trigger,
        externalRunId: run.externalRunId ?? null,
        inputSummary: run.inputSummary ?? null,
        errorMessage: run.errorMessage ?? null,
        startedAt: run.startedAt,
        completedAt: run.completedAt ?? null,
        updatedAt: run.updatedAt,
      }));
  },
});

export const createRun = mutation({
  args: {
    projectId: v.id("projects"),
    connectionId: v.optional(v.id("agentConnections")),
    module: aiModule,
    title: v.string(),
    inputSummary: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireProjectAccess(ctx, args.projectId);
    const runId = await createRunRecord(ctx, {
      userId: user._id,
      projectId: args.projectId,
      connectionId: args.connectionId,
      module: args.module,
      title: args.title,
      status: "draft",
      trigger: "user",
      inputSummary: args.inputSummary,
    });

    return {
      runId: String(runId),
      startedAt: now(),
    };
  },
});

export const listArtifacts = query({
  args: {
    projectId: v.id("projects"),
    module: v.optional(aiModule),
  },
  handler: async (ctx, args) => {
    await requireProjectAccess(ctx, args.projectId);
    const artifacts = await ctx.db
      .query("projectAiArtifacts")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
    const filtered = artifacts
      .filter((artifact) => !args.module || artifact.module === args.module)
      .sort((a, b) => b.createdAt - a.createdAt);
    const destinationsByArtifact = await listDestinationsForArtifacts(
      ctx,
      filtered.map((artifact) => artifact._id),
    );

    return filtered.map((artifact) => ({
      id: String(artifact._id),
      projectId: String(artifact.projectId),
      runId: artifact.runId ? String(artifact.runId) : null,
      module: artifact.module,
      kind: artifact.kind,
      title: artifact.title,
      summary: artifact.summary ?? null,
      status: artifact.status,
      contentFormat: artifact.contentFormat,
      contentMarkdown: artifact.contentMarkdown ?? null,
      contentJson: artifact.contentJson ?? null,
      externalUrl: artifact.externalUrl ?? null,
      createdAt: artifact.createdAt,
      updatedAt: artifact.updatedAt,
      approvedAt: artifact.approvedAt ?? null,
      destinations: (destinationsByArtifact.get(String(artifact._id)) ?? []).map((destination) => ({
        id: String(destination._id),
        provider: destination.provider,
        action: destination.action,
        status: destination.status,
        destinationLabel: destination.destinationLabel ?? null,
        destinationUrl: destination.destinationUrl ?? null,
        errorMessage: destination.errorMessage ?? null,
        lastSyncedAt: destination.lastSyncedAt ?? null,
        createdAt: destination.createdAt,
        updatedAt: destination.updatedAt,
      })),
    }));
  },
});

export const setArtifactStatus = mutation({
  args: {
    artifactId: v.id("projectAiArtifacts"),
    status: aiArtifactStatus,
  },
  handler: async (ctx, args) => {
    const artifact = await getArtifactRecord(ctx, args.artifactId);
    await requireProjectAccess(ctx, artifact.projectId);
    const timestamp = now();

    await ctx.db.patch(args.artifactId, {
      status: args.status,
      approvedAt: args.status === "approved" ? timestamp : undefined,
      updatedAt: timestamp,
    });

    return {
      artifactId: String(args.artifactId),
      status: args.status,
      updatedAt: timestamp,
    };
  },
});

export const requestArtifactDestination = mutation({
  args: {
    artifactId: v.id("projectAiArtifacts"),
    provider: exportProvider,
    action: v.string(),
  },
  handler: async (ctx, args) => {
    const artifact = await getArtifactRecord(ctx, args.artifactId);
    const { user } = await requireProjectAccess(ctx, artifact.projectId);
    const timestamp = now();
    const destinationId = await ctx.db.insert("artifactDestinations", {
      userId: user._id,
      artifactId: artifact._id,
      projectId: artifact.projectId,
      provider: args.provider,
      action: args.action.trim(),
      status: "requested",
      requestedVia: "claude",
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    return {
      destinationId: String(destinationId),
      requestedAt: timestamp,
    };
  },
});

export const getContextForApi = internalQuery({
  args: {
    userId: v.id("users"),
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    await requireProjectForApi(ctx, args.userId, args.projectId);
    const record = await getContextRecord(ctx, args.projectId);
    if (!record) {
      return null;
    }

    return {
      ...record,
      briefAttachmentName: record.briefAttachmentName ?? null,
      briefAttachmentUrl: await resolveAssetUrl(record.briefAttachmentR2ObjectKey ?? null),
    };
  },
});

export const upsertContextForApi = internalMutation({
  args: {
    userId: v.id("users"),
    projectId: v.id("projects"),
    clientWebsite: v.optional(v.string()),
    competitorUrls: v.array(v.string()),
    referenceUrls: v.array(v.string()),
    brief: v.optional(v.string()),
    briefAttachmentName: v.optional(v.union(v.string(), v.null())),
    briefAttachmentR2ObjectKey: v.optional(v.union(v.string(), v.null())),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireProjectForApi(ctx, args.userId, args.projectId);
    const contextId = await upsertContextRecord(ctx, args);
    return { contextId };
  },
});

export const listRunsForApi = internalQuery({
  args: {
    userId: v.id("users"),
    projectId: v.id("projects"),
    module: v.optional(aiModule),
  },
  handler: async (ctx, args) => {
    await requireProjectForApi(ctx, args.userId, args.projectId);
    const runs = await ctx.db
      .query("projectAiRuns")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    return runs
      .filter((run) => !args.module || run.module === args.module)
      .sort((a, b) => b.startedAt - a.startedAt);
  },
});

export const createRunForApi = internalMutation({
  args: {
    userId: v.id("users"),
    projectId: v.id("projects"),
    connectionId: v.optional(v.id("agentConnections")),
    module: aiModule,
    title: v.string(),
    status: aiRunStatus,
    trigger: v.union(v.literal("user"), v.literal("agent")),
    inputSummary: v.optional(v.string()),
    externalRunId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireProjectForApi(ctx, args.userId, args.projectId);
    const runId = await createRunRecord(ctx, args);
    return { runId };
  },
});

export const listArtifactsForApi = internalQuery({
  args: {
    userId: v.id("users"),
    projectId: v.id("projects"),
    module: v.optional(aiModule),
  },
  handler: async (ctx, args) => {
    await requireProjectForApi(ctx, args.userId, args.projectId);
    const artifacts = await ctx.db
      .query("projectAiArtifacts")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    return artifacts
      .filter((artifact) => !args.module || artifact.module === args.module)
      .sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const createArtifactForApi = internalMutation({
  args: {
    userId: v.id("users"),
    projectId: v.id("projects"),
    runId: v.optional(v.id("projectAiRuns")),
    module: aiModule,
    kind: v.string(),
    title: v.string(),
    summary: v.optional(v.string()),
    status: aiArtifactStatus,
    contentFormat: aiContentFormat,
    contentMarkdown: v.optional(v.string()),
    contentJson: v.optional(v.string()),
    externalUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireProjectForApi(ctx, args.userId, args.projectId);
    if (args.runId) {
      const run = await getRunRecord(ctx, args.runId);
      if (run.projectId !== args.projectId) {
        throw new Error("Run not found.");
      }
    }

    const artifactId = await createArtifactRecord(ctx, args);
    return { artifactId };
  },
});

export const upsertArtifactExportForApi = internalMutation({
  args: {
    userId: v.id("users"),
    artifactId: v.id("projectAiArtifacts"),
    provider: exportProvider,
    action: v.string(),
    status: exportStatus,
    destinationLabel: v.optional(v.string()),
    destinationUrl: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    lastSyncedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const artifact = await getArtifactRecord(ctx, args.artifactId);
    await requireProjectForApi(ctx, args.userId, artifact.projectId);
    const timestamp = now();
    const existing = (
      await ctx.db
        .query("artifactDestinations")
        .withIndex("by_artifact", (q) => q.eq("artifactId", args.artifactId))
        .collect()
    )
      .filter((destination) => destination.provider === args.provider && destination.action === args.action)
      .sort((a, b) => b.updatedAt - a.updatedAt)[0];

    const patch = {
      destinationLabel: normalizeOptional(args.destinationLabel),
      destinationUrl: normalizeOptional(args.destinationUrl),
      errorMessage: normalizeOptional(args.errorMessage),
      lastSyncedAt: args.lastSyncedAt ?? timestamp,
      status: args.status,
      updatedAt: timestamp,
    };

    if (existing) {
      await ctx.db.patch(existing._id, patch);
      return { destinationId: existing._id };
    }

    const destinationId = await ctx.db.insert("artifactDestinations", {
      userId: args.userId,
      artifactId: artifact._id,
      projectId: artifact.projectId,
      provider: args.provider,
      action: args.action.trim(),
      requestedVia: "claude",
      createdAt: timestamp,
      ...patch,
    });

    return { destinationId };
  },
});
