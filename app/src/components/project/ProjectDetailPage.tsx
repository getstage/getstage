import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useParams } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ArrowLeft } from "@phosphor-icons/react";
import { ProjectDialogs } from "@/components/project/ProjectDialogs";
import { ProjectHeader } from "@/components/project/ProjectHeader";
import type { ProjectTab } from "@/components/project/ProjectHeader";
import { KanbanBoard } from "@/components/project/KanbanBoard";
import { ResearchTab } from "@/components/project/ResearchTab";
import { StrategyTab } from "@/components/project/StrategyTab";
import { FlowsTab } from "@/components/project/FlowsTab";
import { MoodboardTab } from "@/components/project/MoodboardTab";
import { GenerateTab } from "@/components/project/GenerateTab";
import { AssetsTab } from "@/components/project/AssetsTab";
import { useProjectDetail } from "@/hooks/useProjectDetail";
import type { Id } from "../../../convex/_generated/dataModel";
import type { Task } from "@/types";

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
  const [activeTab, setActiveTab] = useState<ProjectTab>("overview");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedTab = params.get("tab");
    if (requestedTab && isProjectTab(requestedTab)) {
      setActiveTab(requestedTab);
    }
  }, []);

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
          <div className="mx-auto w-full max-w-[1200px] pt-0">
            <Link
              to="/dashboard"
              className="mb-6 inline-flex w-fit items-center gap-1 text-[13px] font-medium text-[#A3A3A3] transition-colors hover:text-text-primary"
            >
              <ArrowLeft size={14} />
              Back to dashboard
            </Link>

            <ProjectHeader
              project={detail.project}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onShare={() => detail.share.setOpen(true)}
              onEditName={detail.dialogs.openEditNameDialog}
              onEditClient={detail.dialogs.openEditClientDialog}
              onAdjustTimeline={detail.dialogs.openTimelineDialog}
              onEditPhases={detail.dialogs.openPhasesDialog}
              onTogglePaused={() => void detail.dialogs.handleToggleProjectPaused()}
              onDelete={() => detail.dialogs.setOpen("deleteConfirm", true)}
            />
          </div>

          {activeTab === "overview" && (
            <div className="mx-auto w-full max-w-[1200px] pb-[120px] pt-7">
              <KanbanBoard
                phases={detail.project.phases}
                onToggleTask={(taskId) => void detail.tasks.handleToggleTask(taskId as Id<"tasks">)}
              />

              {recentTasks.length > 0 && (
                <div className="mt-4 rounded-[8px] bg-white p-5 shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
                  <div className="mb-1 font-heading text-[16px] font-semibold text-text-primary">
                    Recent Activity
                  </div>
                  <p className="mb-4 text-[13px] text-text-secondary">
                    Latest updates with your project
                  </p>
                  <div className="divide-y divide-border-subtle">
                    {recentTasks.map(({ task }) => {
                      const action = task.isCompleted ? "Completed" : "Updated";
                      return (
                        <div key={task.id} className="flex items-start gap-3 py-3">
                          <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/10 text-[9px] font-semibold text-accent">
                            {task.assignees?.[0]?.name?.charAt(0)?.toUpperCase() ?? "S"}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-[13px] font-medium text-text-primary">
                              {action}: {task.title}
                            </div>
                            <div className="mt-0.5 text-[12px] text-text-tertiary">
                              {detail.project!.name} · {getTimeAgo(task.updatedAt)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "research" && (
            <div className="mx-auto w-full max-w-[1200px] pb-[120px] pt-7">
              <ResearchTab
                projectId={projectId}
                projectName={detail.project.name}
                onReturnToOverview={() => setActiveTab("overview")}
              />
            </div>
          )}

          {activeTab === "strategy" && (
            <div className="mx-auto w-full max-w-[1200px] pb-[120px] pt-7">
              <StrategyTab projectId={projectId} projectName={detail.project.name} />
            </div>
          )}

          {activeTab === "flows" && (
            <div className="mx-auto w-full max-w-[1200px] pb-[120px] pt-7">
              <FlowsTab projectId={projectId} projectName={detail.project.name} />
            </div>
          )}

          {activeTab === "moodboard" && (
            <div className="mx-auto w-full max-w-[1200px] pb-[120px] pt-7">
              <MoodboardTab projectId={projectId} projectName={detail.project.name} />
            </div>
          )}

          {activeTab === "generate" && (
            <div className="mx-auto w-full max-w-[1200px] pb-[120px] pt-7">
              <GenerateTab projectId={projectId} projectName={detail.project.name} />
            </div>
          )}

          {activeTab === "assets" && (
            <div className="mx-auto w-full max-w-[1200px] pb-[120px] pt-7">
              <AssetsTab projectName={detail.project.name} />
            </div>
          )}
        </motion.div>
      </div>

      <ProjectDialogs
        project={detail.project}
        dialogs={detail.dialogs}
        share={detail.share}
      />

    </>
  );
}

function isProjectTab(value: string): value is ProjectTab {
  return value === "overview" || value === "research" || value === "strategy" || value === "flows" || value === "moodboard" || value === "generate" || value === "assets";
}

function ProjectDetailLoadingState() {
  return (
    <div className="mx-auto max-w-[1200px] px-4 py-10 sm:px-10 lg:px-14">
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
