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
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
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
    <WorkspaceFrame>
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
              onShare={() => setIsShareModalOpen(true)}
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
      {isShareModalOpen ? <ShareModal onClose={() => setIsShareModalOpen(false)} /> : null}
    </WorkspaceFrame>
  );
}

function ShareModal({ onClose }: { onClose: () => void }) {
  const portalLink = "https://baseframe.design/";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 p-6 backdrop-blur-[5px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[516px] rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex flex-col justify-center p-3 font-medium leading-[1.5]">
          <h2 id="share-modal-title" className="text-[15px] text-[#0A0A0A]">
            Share with client
          </h2>
          <p className="text-[13px] text-[#525252]">
            Clients can view progress, phases and tasks. They cannot edit anything.
          </p>
        </div>

        <div className="flex flex-col gap-6 rounded-[8px] bg-white p-3 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
          <label className="flex flex-col gap-2">
            <span className="text-[13px] font-medium leading-none text-[#171717]">
              Client portal link
            </span>
            <input
              readOnly
              value={portalLink}
              className="h-[34px] rounded-[6px] bg-[#F5F5F5] px-3 text-[12px] font-medium leading-none text-[#525252] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] outline-none"
            />
          </label>

          <div className="flex flex-col gap-2">
            <div>
              <div className="flex items-center gap-[6px]">
                <p className="text-[13px] font-medium leading-none text-[#171717]">
                  Team members
                </p>
                <button
                  type="button"
                  className="inline-flex h-[22px] cursor-pointer items-center gap-[6px] rounded-[4px] bg-[rgba(70,63,186,0.1)] px-[6px] text-[12px] font-medium leading-none text-[#463FBA] transition-colors hover:bg-[rgba(70,63,186,0.16)]"
                >
                  <LockIcon />
                  Upgrade plan
                </button>
              </div>
              <p className="mt-[2px] text-[12px] font-normal leading-[1.5] text-[#525252]">
                Team members with an active subscription can open this project in the stage workspace and collaborate there.
              </p>
            </div>
            <div className="flex min-h-[38px] items-center justify-between overflow-hidden rounded-[8px] bg-[#F5F5F5] py-[2px] pl-3 pr-[2px] opacity-50 shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
              <input
                type="url"
                placeholder="ex. www.google.com"
                disabled
                className="min-w-0 flex-1 bg-transparent text-[12px] font-medium leading-none text-[#525252] outline-none placeholder:text-[#525252]"
              />
              <button
                type="button"
                disabled
                className="inline-flex h-[34px] shrink-0 items-center gap-[6px] rounded-[6px] border border-[#525252] bg-gradient-to-b from-[#404040] to-[#0A0A0A] px-3 text-[12px] font-medium leading-none text-[#FAFAFA] opacity-50 shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]"
              >
                <PlusIcon />
                Add Member
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 p-3">
          <div className="flex min-w-0 items-center gap-2">
            <SparkleIcon />
            <p className="truncate text-[13px] font-medium leading-[1.5] text-[#0A0A0A]">
              Invite your team members with PRO
            </p>
          </div>
          <div className="flex shrink-0 items-center">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-[27px] cursor-pointer items-center justify-center gap-[6px] rounded-[6px] border border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7B76DF] to-[#463FBA] px-3 text-[12px] font-medium leading-none text-[#FAFAFA] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-opacity hover:opacity-90"
            >
              Upgrade Plan
              <ArrowRightIconSmall />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="h-[14px] w-[14px]">
      <rect x="4" y="7" width="8" height="6" rx="1.4" fill="currentColor" opacity="0.18" />
      <rect x="4" y="7" width="8" height="6" rx="1.4" stroke="currentColor" strokeWidth="1.2" />
      <path d="M5.75 7V5.75a2.25 2.25 0 0 1 4.5 0V7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="h-[14px] w-[14px]">
      <path d="M8 3.5v9M3.5 8h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg viewBox="0 0 18 18" fill="none" aria-hidden="true" className="h-[18px] w-[18px] shrink-0 text-[#463FBA]">
      <path d="M7.5 2.75 8.8 6.7l3.95 1.3-3.95 1.3-1.3 3.95L6.2 9.3 2.25 8l3.95-1.3 1.3-3.95Z" fill="currentColor" />
      <path d="m13.4 10.75.55 1.55 1.55.55-1.55.55-.55 1.55-.55-1.55-1.55-.55 1.55-.55.55-1.55Z" fill="currentColor" opacity="0.72" />
    </svg>
  );
}

function ArrowRightIconSmall() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="h-4 w-4">
      <path d="M3.5 8h8.25M8.75 5l3 3-3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
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
