import { useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useParams } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ArrowLeft } from "@phosphor-icons/react";
import { ProjectDock } from "@/components/dashboard/ProjectDock";
import { ProjectDialogs } from "@/components/project/ProjectDialogs";
import { ProjectHeader } from "@/components/project/ProjectHeader";
import { PhaseNavigation } from "@/components/project/PhaseNavigation";
import { TaskChecklist } from "@/components/project/TaskChecklist";
import { useDockProjects } from "@/hooks/useDockProjects";
import { useProjectDetail } from "@/hooks/useProjectDetail";
import type { Id } from "../../../convex/_generated/dataModel";
import type { Task } from "@/types";

function formatDateShort(ms: number): string {
  const d = new Date(ms);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

function getTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

export function ProjectDetailPage() {
  const { id } = useParams({ from: "/_authed/project/$id" });
  const projectId = id as Id<"projects">;
  const detail = useProjectDetail(projectId);
  const dockProjects = useDockProjects();

  const upcomingTasks = useMemo(() => {
    if (!detail.project) return [];
    const tasks: Array<{ task: Task; phaseName: string }> = [];
    for (const phase of detail.project.phases) {
      for (const task of phase.tasks) {
        if (!task.isCompleted && task.dueDate) {
          tasks.push({ task, phaseName: phase.name });
        }
      }
    }
    return tasks
      .sort((a, b) => (a.task.dueDate ?? 0) - (b.task.dueDate ?? 0))
      .slice(0, 4);
  }, [detail.project]);

  const recentTasks = useMemo(() => {
    if (!detail.project) return [];
    const tasks: Array<{ task: Task; phaseName: string }> = [];
    for (const phase of detail.project.phases) {
      for (const task of phase.tasks) {
        tasks.push({ task, phaseName: phase.name });
      }
    }
    return tasks
      .sort((a, b) => b.task.updatedAt - a.task.updatedAt)
      .slice(0, 4);
  }, [detail.project]);

  if (detail.isLoading) {
    return <ProjectDetailLoadingState />;
  }

  if (!detail.project || !detail.currentPhase) {
    return <ProjectNotFoundState />;
  }

  return (
    <>
      <Helmet>
        <title>{detail.project.name} — Stage</title>
      </Helmet>

      <div className="min-h-[calc(100vh-64px)]">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Top content: back link + header */}
          <div className="mx-auto max-w-[1200px] px-6 pt-6 sm:px-10 lg:px-14">
            <Link
              to="/dashboard"
              className="mb-2 inline-flex w-fit items-center gap-1 text-[13px] text-text-secondary transition-colors hover:text-text-primary"
            >
              <ArrowLeft size={14} />
              Dashboard
            </Link>

            <ProjectHeader
              project={detail.project}
              onShare={() => detail.share.setOpen(true)}
              onEditName={detail.dialogs.openEditNameDialog}
              onEditClient={detail.dialogs.openEditClientDialog}
              onAdjustTimeline={detail.dialogs.openTimelineDialog}
              onEditPhases={detail.dialogs.openPhasesDialog}
              onTogglePaused={() => void detail.dialogs.handleToggleProjectPaused()}
              onDelete={() => detail.dialogs.setOpen("deleteConfirm", true)}
            />
          </div>

          {/* Phase timeline bar — full-bleed */}
          <PhaseNavigation
            phases={detail.project.phases}
            activePhaseId={detail.currentPhase.id}
            onSelect={detail.setActivePhaseId}
          />

          {/* Content grid: tasks left + sidebar right */}
          <div className="mx-auto max-w-[1200px] px-6 pb-[120px] sm:px-10 lg:px-14">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_340px]">
              {/* Main: task checklist */}
              <TaskChecklist
                phase={detail.currentPhase}
                projectId={detail.project.id}
                actionError={detail.actionError}
                addTaskValue={detail.tasks.addTaskValue}
                showAddTask={detail.tasks.showAddTask}
                addTaskInputRef={detail.tasks.addTaskInputRef}
                onAddTaskValueChange={detail.tasks.setAddTaskValue}
                onShowAddTaskChange={detail.tasks.setShowAddTask}
                onSubmitAddTask={() => void detail.tasks.handleAddTaskSubmit()}
                onToggleTask={(taskId) => void detail.tasks.handleToggleTask(taskId)}
                onDeleteTask={(taskId) => void detail.tasks.handleDeleteTask(taskId)}
              />

              {/* Sidebar */}
              <aside className="hidden lg:block">
                {/* Upcoming */}
                {upcomingTasks.length > 0 && (
                  <div className="mb-7">
                    <h3 className="mb-3 font-heading text-[13px] font-semibold text-text-primary">
                      Upcoming
                    </h3>
                    <div className="space-y-0">
                      {upcomingTasks.map(({ task }) => {
                        const now = Date.now();
                        const isSoon =
                          task.dueDate !== undefined &&
                          task.dueDate - now < 3 * 24 * 60 * 60 * 1000;

                        return (
                          <div
                            key={task.id}
                            className="flex items-center gap-2.5 py-2 text-[13px]"
                          >
                            <span
                              className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                                isSoon ? "bg-warning" : "bg-border"
                              }`}
                            />
                            <span className="min-w-0 flex-1 truncate text-text-primary">
                              {task.title}
                            </span>
                            {task.dueDate && (
                              <span
                                className={`shrink-0 text-[12px] ${
                                  isSoon ? "text-warning" : "text-text-tertiary"
                                }`}
                              >
                                {formatDateShort(task.dueDate)}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Recent activity */}
                {recentTasks.length > 0 && (
                  <div>
                    <h3 className="mb-3 font-heading text-[13px] font-semibold text-text-primary">
                      Recent activity
                    </h3>
                    <div className="space-y-0">
                      {recentTasks.map(({ task }) => {
                        const action = task.isCompleted ? "Completed" : "Updated";

                        return (
                          <div
                            key={task.id}
                            className="flex items-start gap-2.5 py-2"
                          >
                            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/10 text-[9px] font-semibold text-accent">
                              {task.assignees?.[0]?.name?.charAt(0)?.toUpperCase() ?? "S"}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-[13px] text-text-primary">
                                <span className="font-medium">
                                  {task.assignees?.[0]?.name?.split(" ")[0] ?? "You"}
                                </span>{" "}
                                {action.toLowerCase()} {task.title}
                              </div>
                              <div className="mt-0.5 text-[11px] text-text-tertiary">
                                {getTimeAgo(task.updatedAt)}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </aside>
            </div>
          </div>
        </motion.div>
      </div>

      <ProjectDialogs
        project={detail.project}
        dialogs={detail.dialogs}
        share={detail.share}
      />

      <ProjectDock projects={dockProjects} />
    </>
  );
}

function ProjectDetailLoadingState() {
  return (
    <div className="mx-auto max-w-[1200px] px-6 py-10 sm:px-10 lg:px-14">
      <div className="skeleton mb-3 h-4 w-28" />
      <div className="flex items-start gap-6">
        <div className="skeleton h-[88px] w-[88px] shrink-0 rounded-full" />
        <div>
          <div className="skeleton mb-2 h-8 w-60" />
          <div className="skeleton h-4 w-40" />
        </div>
      </div>
      <div className="skeleton mt-16 mb-14 h-16 w-full rounded-[14px]" />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_340px]">
        <div className="space-y-3">
          {[1, 2, 3, 4].map((value) => (
            <div key={value} className="skeleton h-10 rounded-lg" />
          ))}
        </div>
        <div className="hidden space-y-3 lg:block">
          <div className="skeleton h-6 w-24" />
          {[1, 2, 3].map((value) => (
            <div key={value} className="skeleton h-8 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}

function ProjectNotFoundState() {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center">
      <h2 className="font-heading text-[22px] font-semibold text-text-primary">
        Project not found
      </h2>
      <Link to="/dashboard" className="mt-2 text-[14px] text-accent hover:underline">
        Back to dashboard
      </Link>
    </div>
  );
}
