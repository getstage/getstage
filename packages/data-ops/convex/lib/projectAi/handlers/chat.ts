import { v } from "convex/values";
import type { Doc, Id } from "../../../_generated/dataModel";
import type { QueryCtx } from "../../../_generated/server";
import { requireProjectAccessOrNull } from "../../../_helpers";
import { getContextRecord } from "../domain/records";
import type { AiModule } from "../domain/validators";

const MAX_PHASES = 30;
const MAX_TASKS = 100;
const ARTIFACT_EXCERPT_CHARS = 4_000;
const MODULES: AiModule[] = [
  "research",
  "strategy",
  "moodboard",
  "flows",
  "generate",
  "delivery",
];

function truncate(value: string | undefined, maxChars: number) {
  if (!value) return undefined;
  return value.length <= maxChars ? value : `${value.slice(0, maxChars)}\n[truncated]`;
}

function artifactExcerpt(artifact: Doc<"projectAiArtifacts">) {
  return truncate(artifact.contentMarkdown ?? artifact.contentJson, ARTIFACT_EXCERPT_CHARS);
}

export const getChatProjectContextArgs = {
  projectId: v.id("projects"),
};

export async function getChatProjectContextHandler(
  ctx: QueryCtx,
  args: { projectId: Id<"projects"> },
) {
  const access = await requireProjectAccessOrNull(ctx, args.projectId);
  if (!access) return null;

  const { project } = access;
  const [context, phaseResults, artifactResults] = await Promise.all([
    getContextRecord(ctx, project._id),
    ctx.db
      .query("phases")
      .withIndex("by_project_order", (q) => q.eq("projectId", project._id))
      .take(MAX_PHASES + 1),
    Promise.all(
      MODULES.map((module) =>
        ctx.db
          .query("projectAiArtifacts")
          .withIndex("by_project_module_createdAt", (q) =>
            q.eq("projectId", project._id).eq("module", module),
          )
          .order("desc")
          .take(1),
      ),
    ),
  ]);

  const phaseDocs = phaseResults.slice(0, MAX_PHASES);
  let remainingTasks = MAX_TASKS;
  let tasksWereTruncated = false;
  const phases = [];
  const tasks = [];

  for (const phase of phaseDocs) {
    const taskResults = remainingTasks > 0
      ? await ctx.db
          .query("tasks")
          .withIndex("by_phase_order", (q) => q.eq("phaseId", phase._id))
          .take(remainingTasks + 1)
      : [];
    const includedTasks = taskResults.slice(0, remainingTasks);
    tasksWereTruncated ||= taskResults.length > includedTasks.length;
    remainingTasks -= includedTasks.length;
    phases.push({
      id: String(phase._id),
      name: phase.name,
      status: phase.status,
      progress: phase.progress,
      taskCount: taskResults.length > includedTasks.length
        ? includedTasks.length + 1
        : includedTasks.length,
      includedTaskCount: includedTasks.length,
    });
    tasks.push(...includedTasks.map((task) => ({
      id: String(task._id),
      phaseId: String(phase._id),
      phaseName: phase.name,
      title: task.title,
      status: task.isCompleted
        ? "done" as const
        : task.boardStatus === "in-progress"
          ? "in_progress" as const
          : "todo" as const,
      summary: truncate(task.summary || task.content, 1_000),
      priority: task.priority ?? null,
      dueDate: task.dueDate,
      updatedAt: task.updatedAt,
    })));
  }

  const artifacts = artifactResults.flat().map((artifact) => ({
    id: String(artifact._id),
    module: artifact.module,
    kind: artifact.kind,
    title: artifact.title,
    summary: truncate(artifact.summary, 1_000),
    status: artifact.status,
    excerpt: artifactExcerpt(artifact),
    updatedAt: artifact.updatedAt,
  }));

  return {
    apiVersion: "v1" as const,
    project: {
      projectId: String(project._id),
      projectName: project.name,
      clientName: project.clientName,
      status: project.status,
      updatedAt: project.updatedAt,
      type: project.type,
      progress: project.progress,
      startDate: project.startDate,
      endDate: project.endDate,
    },
    brief: truncate(context?.brief, 12_000),
    notes: truncate(context?.notes, 4_000),
    phases,
    tasks,
    artifacts,
    omitted: {
      phases: phaseResults.length > phaseDocs.length ? 1 : 0,
      tasks: tasksWereTruncated ? 1 : 0,
      artifacts: 0,
    },
    updatedAt: Math.max(
      project.updatedAt,
      context?.updatedAt ?? 0,
      ...phaseDocs.map((phase) => phase.updatedAt),
      ...tasks.map((task) => task.updatedAt),
      ...artifacts.map((artifact) => artifact.updatedAt),
    ),
  };
}
