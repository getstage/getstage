import { v } from "convex/values";
import type { Doc, Id } from "../../../_generated/dataModel";
import type { QueryCtx } from "../../../_generated/server";
import { requireProjectAccessOrNull } from "../../../_helpers";
import { projectStatusValidator } from "../../../models/projects/validators";
import { getContextRecord } from "../domain/records";
import { aiArtifactStatus, aiModule, type AiModule } from "../domain/validators";

const MAX_PHASES = 30;
const MAX_TASKS = 100;
const MAX_ARTIFACTS_PER_MODULE = 5;
const ARTIFACT_EXCERPT_CHARS = 12_000;
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

const phaseStatusValidator = v.union(
  v.literal("completed"),
  v.literal("active"),
  v.literal("upcoming"),
);

const taskStatusValidator = v.union(
  v.literal("todo"),
  v.literal("in_progress"),
  v.literal("done"),
);

export const getChatProjectContextArgs = {
  projectId: v.id("projects"),
};

export const getChatProjectContextReturns = v.union(
  v.object({
    apiVersion: v.literal("v1"),
    project: v.object({
      projectId: v.string(),
      projectName: v.string(),
      clientName: v.string(),
      status: projectStatusValidator,
      updatedAt: v.number(),
      type: v.string(),
      progress: v.number(),
      startDate: v.number(),
      endDate: v.number(),
    }),
    brief: v.optional(v.string()),
    notes: v.optional(v.string()),
    phases: v.array(v.object({
      id: v.string(),
      name: v.string(),
      status: phaseStatusValidator,
      progress: v.number(),
      taskCount: v.number(),
      includedTaskCount: v.number(),
      tasksTruncated: v.boolean(),
    })),
    tasks: v.array(v.object({
      id: v.string(),
      phaseId: v.string(),
      phaseName: v.string(),
      title: v.string(),
      status: taskStatusValidator,
      summary: v.optional(v.string()),
      priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.null()),
      dueDate: v.optional(v.number()),
      updatedAt: v.number(),
    })),
    artifacts: v.array(v.object({
      id: v.string(),
      module: aiModule,
      kind: v.string(),
      title: v.string(),
      summary: v.optional(v.string()),
      status: aiArtifactStatus,
      excerpt: v.optional(v.string()),
      updatedAt: v.number(),
    })),
    truncated: v.object({
      phases: v.boolean(),
      tasks: v.boolean(),
      artifacts: v.boolean(),
    }),
    updatedAt: v.number(),
  }),
  v.null(),
);

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
          .take(MAX_ARTIFACTS_PER_MODULE),
      ),
    ),
  ]);

  const phaseDocs = phaseResults.slice(0, MAX_PHASES);
  let remainingTasks = MAX_TASKS;
  let tasksWereTruncated = false;
  const phases = [];
  const tasks = [];

  for (const phase of phaseDocs) {
    const taskQuery = ctx.db
      .query("tasks")
      .withIndex("by_phase_order", (q) => q.eq("phaseId", phase._id));

    if (remainingTasks <= 0) {
      const probe = await taskQuery.take(1);
      phases.push({
        id: String(phase._id),
        name: phase.name,
        status: phase.status,
        progress: phase.progress,
        taskCount: probe.length,
        includedTaskCount: 0,
        tasksTruncated: probe.length > 0,
      });
      tasksWereTruncated ||= probe.length > 0;
      continue;
    }

    const taskResults = await taskQuery.take(remainingTasks + 1);
    const includedTasks = taskResults.slice(0, remainingTasks);
    const phaseTasksTruncated = taskResults.length > includedTasks.length;
    tasksWereTruncated ||= phaseTasksTruncated;
    remainingTasks -= includedTasks.length;
    phases.push({
      id: String(phase._id),
      name: phase.name,
      status: phase.status,
      progress: phase.progress,
      taskCount: phaseTasksTruncated
        ? includedTasks.length + 1
        : includedTasks.length,
      includedTaskCount: includedTasks.length,
      tasksTruncated: phaseTasksTruncated,
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

  const artifacts = MODULES.flatMap((_module, moduleIndex) => {
    const moduleArtifacts = artifactResults[moduleIndex] ?? [];
    return moduleArtifacts.map((artifact, indexInModule) => {
      const isNewestInModule = indexInModule === 0;
      return {
        id: String(artifact._id),
        module: artifact.module,
        kind: artifact.kind,
        title: artifact.title,
        summary: isNewestInModule ? truncate(artifact.summary, 1_000) : undefined,
        status: artifact.status,
        excerpt: isNewestInModule ? artifactExcerpt(artifact) : undefined,
        updatedAt: artifact.updatedAt,
      };
    });
  });

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
    truncated: {
      phases: phaseResults.length > phaseDocs.length,
      tasks: tasksWereTruncated,
      artifacts: false,
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
