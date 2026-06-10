import { v } from "convex/values";
import { internal } from "../../../../_generated/api";
import type { Id } from "../../../../_generated/dataModel";
import type { ActionCtx, MutationCtx, QueryCtx } from "../../../../_generated/server";
import { requireProjectAccessForUserId } from "../../../../domain/projects/service";
import { now } from "../../../../helpers/time";
import {
  buildNotionBlocksFromResearchArtifact,
  createNotionChildPage,
  parseNotionPageIdFromInput,
} from "../../../../helpers/integrations/notion/researchExport";
import {
  buildNotionBlocksFromStrategyArtifact,
  createNotionChildPage as createStrategyNotionChildPage,
  parseStrategyArtifactContent,
} from "../../../../helpers/integrations/notion/strategyExport";
import { resolveResearchContentJson } from "../../../../lib/projectAi/domain/researchContent";
import { parseResearchArtifactContent } from "../../../../../src/contracts/parseResearchArtifact";
import type { ViewerContext } from "../../../../models/integrations/contentPlatforms";
import { upsertNotionArtifactDestination, getConnection } from "../domain";

type NotionExportBundle = {
  artifactId: Id<"projectAiArtifacts">;
  projectId: Id<"projects">;
  contentJson: string | null;
  projectName: string;
  connection: {
    id: Id<"nativeIntegrationConnections">;
    status: string;
    defaultParentPageId: string | null;
    defaultParentPageUrl: string | null;
  } | null;
};

type ConnectionTokenRecord = { accessToken: string | null } | null;

type NotionExportResult = {
  destinationUrl: string;
  parentPageId: string;
  parentPageUrl: string | null;
  exportedAt: number;
};

export const getResearchArtifactForNotionExportArgs = {
  userId: v.id("users"),
  artifactId: v.id("projectAiArtifacts"),
};

export const completeNotionResearchExportArgs = {
  userId: v.id("users"),
  artifactId: v.id("projectAiArtifacts"),
  projectId: v.id("projects"),
  connectionId: v.id("nativeIntegrationConnections"),
  destinationUrl: v.string(),
  destinationLabel: v.string(),
  parentPageId: v.string(),
  parentPageUrl: v.optional(v.string()),
  completedAt: v.number(),
};

export const exportResearchArtifactToNotionArgs = {
  artifactId: v.id("projectAiArtifacts"),
  parentPageUrlOrId: v.optional(v.string()),
};

export const getStrategyArtifactForNotionExportArgs = {
  userId: v.id("users"),
  artifactId: v.id("projectAiArtifacts"),
};

export const completeNotionStrategyExportArgs = {
  userId: v.id("users"),
  artifactId: v.id("projectAiArtifacts"),
  projectId: v.id("projects"),
  connectionId: v.id("nativeIntegrationConnections"),
  destinationUrl: v.string(),
  destinationLabel: v.string(),
  parentPageId: v.string(),
  parentPageUrl: v.optional(v.string()),
  completedAt: v.number(),
};

export const exportStrategyArtifactToNotionArgs = {
  artifactId: v.id("projectAiArtifacts"),
  parentPageUrlOrId: v.optional(v.string()),
};

export async function getResearchArtifactForNotionExportHandler(
  ctx: QueryCtx,
  args: { userId: Id<"users">; artifactId: Id<"projectAiArtifacts"> },
) {
  const artifact = await ctx.db.get(args.artifactId);
  if (!artifact) {
    throw new Error("Artifact not found.");
  }

  await requireProjectAccessForUserId(ctx, {
    userId: args.userId,
    projectId: artifact.projectId,
  });

  if (artifact.module !== "research" || artifact.kind !== "researchArtifact") {
    throw new Error("Artifact is not a research artifact.");
  }

  const project = await ctx.db.get(artifact.projectId);
  const connection = await getConnection(ctx, args.userId, "notion");

  return {
    artifactId: artifact._id,
    projectId: artifact.projectId,
    contentJson: artifact.contentJson ?? null,
    projectName: project?.name ?? "Project",
    connection: connection
      ? {
          id: connection._id,
          status: connection.status,
          defaultParentPageId: connection.defaultParentPageId ?? null,
          defaultParentPageUrl: connection.defaultParentPageUrl ?? null,
        }
      : null,
  };
}

export async function completeNotionResearchExportHandler(
  ctx: MutationCtx,
  args: {
    userId: Id<"users">;
    artifactId: Id<"projectAiArtifacts">;
    projectId: Id<"projects">;
    connectionId: Id<"nativeIntegrationConnections">;
    destinationUrl: string;
    destinationLabel: string;
    parentPageId: string;
    parentPageUrl?: string;
    completedAt: number;
  },
) {
  const timestamp = args.completedAt;

  await ctx.db.patch(args.connectionId, {
    defaultParentPageId: args.parentPageId,
    defaultParentPageUrl: args.parentPageUrl ?? args.destinationUrl,
    lastSyncedAt: timestamp,
    updatedAt: timestamp,
  });
  await upsertNotionArtifactDestination(ctx, {
    userId: args.userId,
    projectId: args.projectId,
    artifactId: args.artifactId,
    action: "research_notion_export",
    destinationLabel: args.destinationLabel,
    destinationUrl: args.destinationUrl,
    completedAt: timestamp,
  });
}

export async function exportResearchArtifactToNotionHandler(
  ctx: ActionCtx,
  args: { artifactId: Id<"projectAiArtifacts">; parentPageUrlOrId?: string },
): Promise<NotionExportResult> {
  const viewer = (await ctx.runQuery(internal.onboarding.getViewerContext, {})) as ViewerContext;
  const bundle = (await ctx.runQuery(
    internal.integrations.contentPlatforms.getResearchArtifactForNotionExport,
    {
      userId: viewer.userId,
      artifactId: args.artifactId,
    },
  )) as NotionExportBundle;

  if (!bundle.connection || bundle.connection.status !== "active") {
    throw new Error("Connect Notion in Settings before exporting.");
  }

  const tokenRecord = (await ctx.runQuery(
    internal.integrations.contentPlatforms.getConnectionTokenForProvider,
    { userId: viewer.userId, provider: "notion" },
  )) as ConnectionTokenRecord;

  if (!tokenRecord?.accessToken) {
    throw new Error("Notion access token is unavailable. Reconnect Notion in Settings.");
  }

  const resolvedContentJson =
    (await resolveResearchContentJson(bundle.contentJson ?? null)) ?? bundle.contentJson ?? "";
  const parsedArtifact = parseResearchArtifactContent(resolvedContentJson);
  if (!parsedArtifact) {
    throw new Error("Research artifact content could not be parsed.");
  }

  const parentInput =
    args.parentPageUrlOrId?.trim() ||
    bundle.connection.defaultParentPageUrl?.trim() ||
    bundle.connection.defaultParentPageId?.trim() ||
    "";

  if (!parentInput) {
    throw new Error("NOTION_PARENT_REQUIRED");
  }

  const parentPageId = parseNotionPageIdFromInput(parentInput);
  const parentPageUrl: string | undefined =
    args.parentPageUrlOrId?.trim() || bundle.connection.defaultParentPageUrl || undefined;
  const children = buildNotionBlocksFromResearchArtifact(parsedArtifact);
  const pageTitle = `${bundle.projectName} Research`;
  const { destinationUrl } = await createNotionChildPage({
    accessToken: tokenRecord.accessToken,
    parentPageId,
    title: pageTitle,
    children,
  });

  const completedAt = now();
  await ctx.runMutation(internal.integrations.contentPlatforms.completeNotionResearchExport, {
    userId: viewer.userId,
    artifactId: bundle.artifactId,
    projectId: bundle.projectId,
    connectionId: bundle.connection.id,
    destinationUrl,
    destinationLabel: pageTitle,
    parentPageId,
    parentPageUrl,
    completedAt,
  });

  return {
    destinationUrl,
    parentPageId,
    parentPageUrl: parentPageUrl ?? null,
    exportedAt: completedAt,
  };
}

export async function getStrategyArtifactForNotionExportHandler(
  ctx: QueryCtx,
  args: { userId: Id<"users">; artifactId: Id<"projectAiArtifacts"> },
) {
  const artifact = await ctx.db.get(args.artifactId);
  if (!artifact) {
    throw new Error("Artifact not found.");
  }

  await requireProjectAccessForUserId(ctx, {
    userId: args.userId,
    projectId: artifact.projectId,
  });

  if (artifact.module !== "strategy" || artifact.kind !== "strategyArtifact") {
    throw new Error("Artifact is not a strategy artifact.");
  }

  const project = await ctx.db.get(artifact.projectId);
  const connection = await getConnection(ctx, args.userId, "notion");

  return {
    artifactId: artifact._id,
    projectId: artifact.projectId,
    contentJson: artifact.contentJson ?? null,
    projectName: project?.name ?? "Project",
    connection: connection
      ? {
          id: connection._id,
          status: connection.status,
          defaultParentPageId: connection.defaultParentPageId ?? null,
          defaultParentPageUrl: connection.defaultParentPageUrl ?? null,
        }
      : null,
  };
}

export async function completeNotionStrategyExportHandler(
  ctx: MutationCtx,
  args: {
    userId: Id<"users">;
    artifactId: Id<"projectAiArtifacts">;
    projectId: Id<"projects">;
    connectionId: Id<"nativeIntegrationConnections">;
    destinationUrl: string;
    destinationLabel: string;
    parentPageId: string;
    parentPageUrl?: string;
    completedAt: number;
  },
) {
  const timestamp = args.completedAt;

  await ctx.db.patch(args.connectionId, {
    defaultParentPageId: args.parentPageId,
    defaultParentPageUrl: args.parentPageUrl ?? args.destinationUrl,
    lastSyncedAt: timestamp,
    updatedAt: timestamp,
  });
  await upsertNotionArtifactDestination(ctx, {
    userId: args.userId,
    projectId: args.projectId,
    artifactId: args.artifactId,
    action: "strategy_notion_export",
    destinationLabel: args.destinationLabel,
    destinationUrl: args.destinationUrl,
    completedAt: timestamp,
  });
}

export async function exportStrategyArtifactToNotionHandler(
  ctx: ActionCtx,
  args: { artifactId: Id<"projectAiArtifacts">; parentPageUrlOrId?: string },
): Promise<NotionExportResult> {
  const viewer = (await ctx.runQuery(internal.onboarding.getViewerContext, {})) as ViewerContext;
  const bundle = (await ctx.runQuery(
    internal.integrations.contentPlatforms.getStrategyArtifactForNotionExport,
    {
      userId: viewer.userId,
      artifactId: args.artifactId,
    },
  )) as NotionExportBundle;

  if (!bundle.connection || bundle.connection.status !== "active") {
    throw new Error("Connect Notion in Settings before exporting.");
  }

  const tokenRecord = (await ctx.runQuery(
    internal.integrations.contentPlatforms.getConnectionTokenForProvider,
    { userId: viewer.userId, provider: "notion" },
  )) as ConnectionTokenRecord;

  if (!tokenRecord?.accessToken) {
    throw new Error("Notion access token is unavailable. Reconnect Notion in Settings.");
  }

  const parsedArtifact = parseStrategyArtifactContent(bundle.contentJson ?? "");
  if (!parsedArtifact) {
    throw new Error("Strategy artifact content could not be parsed.");
  }

  const parentInput =
    args.parentPageUrlOrId?.trim() ||
    bundle.connection.defaultParentPageUrl?.trim() ||
    bundle.connection.defaultParentPageId?.trim() ||
    "";

  if (!parentInput) {
    throw new Error("NOTION_PARENT_REQUIRED");
  }

  const parentPageId = parseNotionPageIdFromInput(parentInput);
  const parentPageUrl: string | undefined =
    args.parentPageUrlOrId?.trim() || bundle.connection.defaultParentPageUrl || undefined;
  const children = buildNotionBlocksFromStrategyArtifact(parsedArtifact);
  const pageTitle = `${bundle.projectName} Strategy`;
  const { destinationUrl } = await createStrategyNotionChildPage({
    accessToken: tokenRecord.accessToken,
    parentPageId,
    title: pageTitle,
    children,
  });

  const completedAt = now();
  await ctx.runMutation(internal.integrations.contentPlatforms.completeNotionStrategyExport, {
    userId: viewer.userId,
    artifactId: bundle.artifactId,
    projectId: bundle.projectId,
    connectionId: bundle.connection.id,
    destinationUrl,
    destinationLabel: pageTitle,
    parentPageId,
    parentPageUrl,
    completedAt,
  });

  return {
    destinationUrl,
    parentPageId,
    parentPageUrl: parentPageUrl ?? null,
    exportedAt: completedAt,
  };
}
