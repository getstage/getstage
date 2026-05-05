import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { WorkspaceFrame } from "@/app/WorkspaceFrame";
import { ProjectHeader } from "./ProjectHeader";
import { KanbanBoard } from "./KanbanBoard";
import { AssetsTab } from "./tabs/AssetsTab";
import { FlowsTab } from "./tabs/FlowsTab";
import { MoodboardTab } from "./tabs/MoodboardTab";
import { ResearchTab } from "./tabs/ResearchTab";
import { StrategyTab } from "./tabs/StrategyTab";
import { WireframesTab } from "./tabs/WireframesTab";
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
    return tasks.sort((a, b) => b.task.updatedAt - a.task.updatedAt).slice(0, 3);
  }, [project]);

  return (
    <WorkspaceFrame defaultSidebarCollapsed>
      <div className="flex-1 px-[clamp(24px,7vw,100px)] py-[44px]">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="w-full pt-0">
            <button
              type="button"
              onClick={() => void navigate({ to: "/" })}
              className="mb-6 inline-flex w-fit cursor-pointer items-center gap-[8px] text-[13px] font-medium text-[#A3A3A3] transition-colors hover:text-[#525252]"
            >
              <ArrowLeftIcon />
              Back to dashboard
            </button>

            <ProjectHeader
              project={project}
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />
          </div>

          {activeTab === "overview" && (
            <div className="w-full pb-[120px] pt-7">
              <KanbanBoard phases={project.phases} />

              {recentTasks.length > 0 && (
                <div className="mt-3 overflow-hidden rounded-[12px] bg-[#F5F5F5] p-1">
                  <div className="flex flex-col gap-6 rounded-[8px] bg-gradient-to-b from-white to-[#FAFAFA] p-4 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
                    <div>
                      <div className="font-heading text-[14px] font-medium leading-[1.2] text-[#0A0A0A]">
                        Recent Activity
                      </div>
                      <p className="mt-1 text-[12px] font-medium leading-[1.5] text-[#737373]">
                        Latest updates with your project
                      </p>
                    </div>
                    <div className="flex flex-col gap-4">
                      {recentTasks.map(({ task }, index) => {
                        const action = task.isCompleted ? "Completed" : "Updated";
                        const showDivider = index < recentTasks.length - 1;
                        return (
                          <div key={task.id} className="flex flex-col gap-4">
                            <div className="flex items-start gap-[10px]">
                              <div className="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-[#E5E5E5] px-2 py-[3px] text-[12px] font-medium leading-[1.5] text-[#221E6C]">
                                {task.assignees?.[0]?.name?.charAt(0)?.toUpperCase() ?? "S"}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-[13px] font-medium leading-[1.2] text-[#0A0A0A]">
                                  {action}: {task.title}
                                </div>
                                <div className="mt-1 text-[12px] font-medium leading-[1.5] text-[#737373]">
                                  {formatRelativeTime(task.updatedAt)}
                                </div>
                              </div>
                            </div>
                            {showDivider ? <div className="h-px w-full bg-[#E5E5E5]" /> : null}
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-[12px] font-normal leading-[1.5] text-[#737373]">
                      {recentTasks.length} Activities today
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab !== "overview" && (
            <div className="w-full pb-[120px] pt-7">
              {activeTab === "research" ? <ResearchTab project={project} /> : null}
              {activeTab === "strategy" ? <StrategyTab /> : null}
              {activeTab === "moodboard" ? <MoodboardTab project={project} /> : null}
              {activeTab === "flows" ? <FlowsTab project={project} /> : null}
              {activeTab === "wireframes" ? <WireframesTab /> : null}
              {activeTab === "assets" ? <AssetsTab project={project} /> : null}
            </div>
          )}
        </motion.div>
      </div>
    </WorkspaceFrame>
  );
}

function ArrowLeftIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className="h-[16px] w-[16px] shrink-0"
    >
      <path
        d="M10 4 6 8l4 4M6.5 8H13"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
