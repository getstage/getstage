import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ProjectHeader } from "./ProjectHeader";
import { KanbanBoard } from "./KanbanBoard";
import { AssetsTab } from "./tabs/AssetsTab";
import { FlowsTab } from "./tabs/FlowsTab";
import { MoodboardTab } from "./tabs/MoodboardTab";
import { ResearchTab } from "./tabs/ResearchTab";
import { StrategyTab } from "./tabs/StrategyTab";
import { WireframesTab } from "./tabs/WireframesTab";
import { useLiveProject } from "@/project/hooks";
import { formatRelativeTime } from "@/lib/utils";
import type { Phase, Project, ProjectTab } from "../models/project";

type ProjectTimeline = {
  start: string;
  end: string;
};

function formatTimelineDate(timestamp: number) {
  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(timestamp));
}

export function ProjectDetailView() {
  const navigate = useNavigate();
  const { projectId } = useParams({ from: "/_authed/project/$projectId" });
  const live = useLiveProject(projectId);
  const [activeTab, setActiveTab] = useState<ProjectTab>("overview");
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [project, setProject] = useState<Project | null>(null);
  const [timeline, setTimeline] = useState<ProjectTimeline>({ start: "", end: "" });

  useEffect(() => {
    if (live.project) {
      setProject(live.project);
    }
  }, [live.project]);

  useEffect(() => {
    if (live.detail) {
      setTimeline({
        start: formatTimelineDate(live.detail.startDate),
        end: formatTimelineDate(live.detail.endDate),
      });
    }
  }, [live.detail]);

  function updateProjectName(name: string) {
    setProject((current) => (current ? { ...current, name } : current));
  }

  function updateClientName(clientName: string) {
    setProject((current) => (current ? { ...current, clientName } : current));
  }

  function updateTimeline(nextTimeline: ProjectTimeline) {
    setTimeline(nextTimeline);
  }

  function updatePhases(phases: Phase[]) {
    setProject((current) => (current ? { ...current, phases } : current));
  }

  function pauseProject() {
    setProject((current) => (current ? { ...current, status: "paused" } : current));
  }

  function deleteProject() {
    void navigate({ to: "/projects" });
  }

  const recentTasks = useMemo(() => {
    if (!project) return [];
    const tasks: Array<{ task: Project["phases"][0]["tasks"][0]; phaseName: string }> = [];
    for (const phase of project.phases) {
      for (const task of phase.tasks) {
        tasks.push({ task, phaseName: phase.name });
      }
    }
    return tasks.sort((a, b) => b.task.updatedAt - a.task.updatedAt).slice(0, 3);
  }, [project]);

  if (!project) {
    return (
      <div className="flex flex-1 items-center justify-center px-[clamp(16px,7vw,100px)] py-[clamp(20px,4vw,44px)]">
        {live.error ? (
          <div className="flex flex-col items-center gap-[8px] text-center">
            <p className="text-[14px] font-medium text-[#b91c1c]">
              Could not load this project.
            </p>
            <button
              type="button"
              onClick={() => void navigate({ to: "/projects" })}
              className="text-[13px] font-medium text-[#525252] underline"
            >
              Back to projects
            </button>
          </div>
        ) : (
          <p className="text-[13px] font-medium text-[#737373]">
            Loading project…
          </p>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 px-[clamp(16px,7vw,100px)] py-[clamp(20px,4vw,44px)]">
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
              timeline={timeline}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onShare={() => setIsShareModalOpen(true)}
              onProjectNameSave={updateProjectName}
              onClientNameSave={updateClientName}
              onTimelineSave={updateTimeline}
              onPhasesSave={updatePhases}
              onPauseProject={pauseProject}
              onDeleteProject={deleteProject}
            />
          </div>

          {activeTab === "overview" && (
            <div className="w-full pb-[120px] pt-7">
              <KanbanBoard phases={project.phases} projectId={project.id} projectName={project.name} />

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
    </>
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
        <div className="flex flex-col justify-center p-[12px] font-medium leading-[1.5]">
          <h2 id="share-modal-title" className="text-[15px] leading-[1.5] text-[#0A0A0A]">
            Share with client
          </h2>
          <p className="text-[13px] leading-[1.5] text-[#525252]">
            Clients can view progress, phases and tasks. They cannot edit anything.
          </p>
        </div>

        <div className="flex flex-col gap-[24px] rounded-[8px] bg-white p-[12px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
          <label className="flex flex-col gap-[8px]">
            <span className="text-[13px] font-medium leading-none text-[#171717]">
              Client portal link
            </span>
            <input
              readOnly
              value={portalLink}
              className="h-[34px] rounded-[6px] bg-[#F5F5F5] px-[12px] text-[12px] font-medium leading-none text-[#525252] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] outline-none"
            />
          </label>

          <div className="flex flex-col gap-[8px]">
            <div className="flex flex-col gap-[4px]">
              <div className="flex items-center gap-[6px]">
                <p className="text-[13px] font-medium leading-none text-[#171717]">
                  Team members
                </p>
                <button
                  type="button"
                  className="inline-flex cursor-pointer items-center justify-center gap-[6px] rounded-[4px] bg-[rgba(70,63,186,0.1)] px-[6px] py-[4px] text-[12px] font-medium leading-none text-[#463FBA] transition-colors hover:bg-[rgba(70,63,186,0.16)]"
                >
                  <img
                    src="/logos/dashboard/lock.svg"
                    alt=""
                    aria-hidden="true"
                    className="h-[14px] w-[14px] shrink-0"
                  />
                  Upgrade plan
                </button>
              </div>
              <p className="text-[12px] font-normal leading-[1.5] text-[#525252]">
                Team members with an active subscription can open this project in the stage workspace and collaborate there.
              </p>
            </div>
            <div className="flex min-h-[38px] items-center justify-between overflow-hidden rounded-[8px] bg-[#F5F5F5] py-[2px] pl-3 pr-[2px] opacity-50 shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
              <input
                type="url"
                placeholder="ex. www.google.com"
                disabled
                className="min-w-0 flex-1 bg-transparent text-[12px] font-medium leading-[1.25] text-[#525252] outline-none placeholder:text-[#525252]"
              />
              <button
                type="button"
                disabled
                className="inline-flex h-[30px] shrink-0 items-center gap-[6px] rounded-[6px] border border-[#525252] bg-gradient-to-b from-[#404040] to-[#0A0A0A] pl-[10px] pr-[12px] text-[12px] font-medium leading-none text-[#FAFAFA] opacity-50 shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]"
              >
                <span
                  aria-hidden="true"
                  className="h-[12px] w-[12px] shrink-0 bg-current"
                  style={{
                    WebkitMask: 'url("/logos/dashboard/plus.svg") center / contain no-repeat',
                    mask: 'url("/logos/dashboard/plus.svg") center / contain no-repeat',
                  }}
                />
                Add Member
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 p-[12px]">
          <div className="flex min-w-0 items-center gap-[8px]">
            <SparkleIcon />
            <p className="truncate text-[13px] font-medium leading-[1.5] text-[#0A0A0A]">
              Invite your team members with PRO
            </p>
          </div>
          <div className="flex shrink-0 items-center">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex cursor-pointer items-center justify-center gap-[6px] rounded-[6px] border border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7B76DF] to-[#463FBA] py-[6px] pl-[10px] pr-[12px] text-[12px] font-medium leading-none text-[#FAFAFA] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-opacity hover:opacity-90"
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

function SparkleIcon() {
  return (
    <span
      aria-hidden="true"
      className="h-[18px] w-[18px] shrink-0 bg-[#7B76DF]"
      style={{
        WebkitMask: 'url("/logos/dashboard/ai-generated.svg") center / contain no-repeat',
        mask: 'url("/logos/dashboard/ai-generated.svg") center / contain no-repeat',
      }}
    />
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
