import type { Doc, Id } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";
import { getPhasesForProject, getPortalConfigByProjectId } from "../../_helpers";
import { resolveAssetUrl } from "../../r2";

type ReaderCtx = QueryCtx | MutationCtx;

function now() {
  return Date.now();
}

export async function buildProject(ctx: ReaderCtx, project: Doc<"projects">) {
  const portalConfig = await getPortalConfigByProjectId(ctx, project._id);

  return {
    id: String(project._id),
    userId: String(project.userId),
    name: project.name,
    clientName: project.clientName,
    clientAvatarUrl: await resolveAssetUrl(project.clientAvatarUrl ?? null) ?? undefined,
    type: project.type,
    status: project.status,
    startDate: project.startDate,
    endDate: project.endDate,
    progress: project.progress,
    createdAt: project.createdAt,
    shareToken: portalConfig?.shareToken,
    shareUrl: portalConfig?.shareUrl,
    portalEnabled: portalConfig?.isEnabled,
    phases: await getPhasesForProject(ctx, project),
  };
}

export async function listProjectsForUser(ctx: ReaderCtx, userId: Id<"users">) {
  const projectDocs = await ctx.db
    .query("projects")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();

  const sortedProjectDocs = [...projectDocs].sort((a, b) => a.startDate - b.startDate);
  return Promise.all(sortedProjectDocs.map((project) => buildProject(ctx, project)));
}

export async function recomputeProjectState(
  ctx: MutationCtx,
  projectId: Id<"projects">,
) {
  const project = await ctx.db.get(projectId);
  if (!project) {
    throw new Error("Project not found.");
  }

  const phases = await ctx.db
    .query("phases")
    .withIndex("by_project_order", (q) => q.eq("projectId", projectId))
    .collect();

  const timestamp = now();
  const phaseStates = await Promise.all(
    phases.map(async (phase) => {
      const tasks = await ctx.db
        .query("tasks")
        .withIndex("by_phase_order", (q) => q.eq("phaseId", phase._id))
        .collect();

      const total = tasks.length;
      const completed = tasks.filter((task) => task.isCompleted).length;
      const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

      return { phase, progress };
    }),
  );

  const firstIncompleteIndex = phaseStates.findIndex((phaseState) => phaseState.progress < 100);

  await Promise.all(
    phaseStates.map(async (phaseState, index) => {
      const nextStatus =
        firstIncompleteIndex === -1
          ? "completed"
          : index < firstIncompleteIndex
            ? "completed"
            : index === firstIncompleteIndex
              ? "active"
              : "upcoming";

      if (
        phaseState.phase.progress !== phaseState.progress ||
        phaseState.phase.status !== nextStatus
      ) {
        await ctx.db.patch(phaseState.phase._id, {
          progress: phaseState.progress,
          status: nextStatus,
          updatedAt: timestamp,
        });
      }
    }),
  );

  const totalPhaseProgress = phaseStates.reduce((sum, phaseState) => sum + phaseState.progress, 0);
  const nextProgress =
    phaseStates.length > 0 ? Math.round(totalPhaseProgress / phaseStates.length) : 0;
  const nextStatus =
    phaseStates.length > 0 && phaseStates.every((phaseState) => phaseState.progress === 100)
      ? "completed"
      : project.status === "paused"
        ? "paused"
        : "active";

  if (project.progress !== nextProgress || project.status !== nextStatus) {
    await ctx.db.patch(project._id, {
      progress: nextProgress,
      status: nextStatus,
      updatedAt: timestamp,
    });
  }
}
