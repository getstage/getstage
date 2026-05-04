import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { WorkspaceFrame } from "@/app/WorkspaceFrame";
import { ProjectHeader } from "./ProjectHeader";
import { KanbanBoard } from "./KanbanBoard";
import { AssetsTab } from "./tabs/AssetsTab";
import { FlowsTab } from "./tabs/FlowsTab";
import { GenerateTab } from "./tabs/GenerateTab";
import { MoodboardTab } from "./tabs/MoodboardTab";
import { ResearchTab } from "./tabs/ResearchTab";
import { StrategyTab } from "./tabs/StrategyTab";
import { formatRelativeTime } from "@/lib/utils";
import type { ProjectTab } from "../models/project";
import { mockProject } from "../data/projectSnapshot";

export function ProjectDetailView() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ProjectTab>("overview");
  const project = mockProject;

  const recentTasks = useMemo(() => {
    const tasks: Array<{ task: typeof project.phases[0]["tasks"][0]; phaseName: string }> = [];
    for (const phase of project.phases) {
      for (const task of phase.tasks) {
        tasks.push({ task, phaseName: phase.name });
      }
    }
    return tasks.sort((a, b) => b.task.updatedAt - a.task.updatedAt).slice(0, 4);
  }, [project]);

  return (
    <WorkspaceFrame>
      <div className="flex-1 px-[44px] py-[44px]">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="mx-auto w-full max-w-[1200px] pt-0">
            <button
              type="button"
              onClick={() => void navigate({ to: "/" })}
              className="mb-6 inline-flex w-fit items-center gap-1 text-[13px] font-medium text-[#A3A3A3] transition-colors hover:text-text-primary"
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-[14px] w-[14px]">
                <path d="M10 3L5 8l5 5" />
              </svg>
              Back to dashboard
            </button>

            <ProjectHeader
              project={project}
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />
          </div>

          {activeTab === "overview" && (
            <div className="mx-auto w-full max-w-[1200px] pb-[120px] pt-7">
              <KanbanBoard phases={project.phases} />

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
                              {project.name} · {formatRelativeTime(task.updatedAt)}
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

          {activeTab !== "overview" && (
            <div className="mx-auto w-full max-w-[1200px] pb-[120px] pt-7">
              {activeTab === "research" ? <ResearchTab project={project} /> : null}
              {activeTab === "strategy" ? <StrategyTab /> : null}
              {activeTab === "moodboard" ? <MoodboardTab project={project} /> : null}
              {activeTab === "flows" ? <FlowsTab project={project} /> : null}
              {activeTab === "generate" ? <GenerateTab /> : null}
              {activeTab === "assets" ? <AssetsTab project={project} /> : null}
            </div>
          )}
        </motion.div>
      </div>
    </WorkspaceFrame>
  );
}
