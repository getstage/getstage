import type { Id } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";
import { now } from "../time";

type ReaderCtx = QueryCtx | MutationCtx;

function getEnv(name: string) {
  return (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.[
    name
  ];
}

const PORTAL_BASE_URL = getEnv("SITE_URL") ?? "https://getstage.co";

function generateShareToken() {
  return `share_${Math.random().toString(36).slice(2, 12)}`;
}

export async function getPortalConfigByProjectId(
  ctx: ReaderCtx,
  projectId: Id<"projects">,
) {
  return ctx.db
    .query("portalConfigs")
    .withIndex("by_project", (q) => q.eq("projectId", projectId))
    .unique();
}

export async function ensurePortalConfig(
  ctx: MutationCtx,
  projectId: Id<"projects">,
) {
  const existing = await getPortalConfigByProjectId(ctx, projectId);
  if (existing) {
    return existing;
  }

  const project = await ctx.db.get(projectId);
  if (!project) {
    throw new Error("Project not found.");
  }

  const user = await ctx.db.get(project.userId);
  const shareToken = generateShareToken();
  const timestamp = now();
  const portalConfigId = await ctx.db.insert("portalConfigs", {
    projectId,
    isEnabled: true,
    shareToken,
    shareUrl: `${PORTAL_BASE_URL}/portal/${shareToken}`,
    logoUrl: user?.defaultPortalLogoUrl,
    accentColor: user?.defaultPortalAccentColor ?? "#E8734A",
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  const created = await ctx.db.get(portalConfigId);
  if (!created) {
    throw new Error("Failed to create portal config.");
  }

  return created;
}
