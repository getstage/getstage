import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import type { ProviderId } from "@stage/data-ops/contracts";
import { useNavigate, useParams } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Avatar } from "@/components/ui/Avatar";
import { ProjectHeader } from "./ProjectHeader";
import { KanbanBoard } from "./KanbanBoard";
import {
  useLiveProject,
  useProjectHeaderActions,
} from "@/hooks/project";
import { useSettingsOverviewQuery } from "@/hooks/convex-data";
import { useProjectShareLink } from "@/hooks/useProjectShareLink";
import { formatInputDate } from "@/lib/format";
import { getProjectBackDestination } from "@/lib/projectBackDestination";
import { WORKFLOW_STEPS } from "@stage/data-ops";
import { formatRelativeTime } from "@/lib/utils";
import type { Project, ProjectTab } from "@/models/project/project";
import { TabLoadingState } from "./tabs/TabLoadingState";

type StepTab = Exclude<ProjectTab, "overview">;

const PROJECT_STEP_LABELS: Record<StepTab, string> = {
  research: "Research",
  strategy: "Strategy",
  moodboard: "Moodboard",
  flows: "Flows",
  wireframes: "Wireframes",
  assets: "Assets",
};

/** Stable identity for the frame before the project detail has loaded. */
const NO_SELECTION: readonly string[] = [];

const ProjectStepView = lazy(() =>
  import("./ProjectStepView").then((module) => ({
    default: module.ProjectStepView,
  })),
);

function formatTimelineDate(timestamp: number) {
  return formatInputDate(new Date(timestamp));
}

function getRecentActivityAvatarUrl(
  profile: { name: string; email: string; avatarUrl: string | null } | undefined,
) {
  return profile?.avatarUrl ?? undefined;
}

export function ProjectDetailView() {
  const navigate = useNavigate();
  const { projectId } = useParams({ from: "/_authed/project/$projectId" });
  const settingsOverviewQuery = useSettingsOverviewQuery();
  const profile = settingsOverviewQuery.data?.profile;
  const [isLeavingAfterDelete, setIsLeavingAfterDelete] = useState(false);
  const [activeTab, setActiveTab] = useState<ProjectTab>("overview");
  const live = useLiveProject(projectId, { enabled: !isLeavingAfterDelete });
  const artifactQueriesEnabled =
    !isLeavingAfterDelete && Boolean(live.detail) && !live.isLoading && !live.isNotFound;
  const [modalError, setModalError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const actions = useProjectHeaderActions({
    projectId,
    detail: live.detail,
    onDeleteSuccess: () => {
      void navigate({ to: "/projects", replace: true });
    },
    onLeavingAfterDelete: setIsLeavingAfterDelete,
  });
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [pendingStrategyGeneration, setPendingStrategyGeneration] = useState(false);
  const [pendingStrategyProviderId, setPendingStrategyProviderId] = useState<ProviderId | null>(
    null,
  );
  const projectBackDestination = getProjectBackDestination();
  const timeline = useMemo(
    () => ({
      start: live.detail ? formatTimelineDate(live.detail.startDate) : "",
      end: live.detail ? formatTimelineDate(live.detail.endDate) : "",
    }),
    [live.detail],
  );
  // The API resolves enabledSteps to a concrete array; `??` only covers the brief frame
  // before the project detail has loaded (the header isn't shown then anyway).
  const enabledSteps: readonly string[] = live.detail?.enabledSteps ?? WORKFLOW_STEPS;

  // If the active step gets turned off via Edit Workflow, fall back to Overview so we
  // never render a tab the project has disabled.
  useEffect(() => {
    if (activeTab !== "overview" && !enabledSteps.includes(activeTab)) {
      setActiveTab("overview");
    }
  }, [activeTab, enabledSteps]);

  async function runModalAction(action: () => Promise<void>) {
    setModalError(null);
    try {
      await action();
    } catch (error) {
      setModalError(actions.toActionErrorMessage(error));
      throw error;
    }
  }

  async function runDeleteAction() {
    setDeleteError(null);
    try {
      await actions.deleteProject();
    } catch (error) {
      setDeleteError(actions.toActionErrorMessage(error));
      throw error;
    }
  }

  const recentTasks = useMemo(() => {
    if (!live.project) return [];
    const tasks: Array<{ task: Project["phases"][0]["tasks"][0]; phaseName: string }> = [];
    for (const phase of live.project.phases) {
      for (const task of phase.tasks) {
        tasks.push({ task, phaseName: phase.name });
      }
    }
    return tasks.sort((a, b) => b.task.updatedAt - a.task.updatedAt).slice(0, 3);
  }, [live.project]);

  function goBack() {
    void navigate({ to: projectBackDestination.href as never });
  }

  function handleGenerateStrategy(providerId: ProviderId) {
    setPendingStrategyProviderId(providerId);
    setPendingStrategyGeneration(true);
    setActiveTab("strategy");
  }

  if (live.isLoading) {
    return <TabLoadingState label="Loading project…" />;
  }

  if (!live.project) {
    return (
      <div className="flex min-h-[calc(100dvh-88px)] flex-1 items-center justify-center px-[clamp(16px,7vw,100px)] py-[clamp(20px,4vw,44px)]">
        <div className="flex flex-col items-center gap-[8px] text-center">
          <p className="text-[14px] font-medium text-[#b91c1c]">
            Could not load this project.
          </p>
          <button
            type="button"
            onClick={goBack}
            className="inline-flex items-center gap-[8px] text-[13px] font-medium text-[#525252] underline"
          >
            <ArrowLeftIcon />
            {projectBackDestination.label}
          </button>
        </div>
      </div>
    );
  }

  const project = live.project;

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
              onClick={goBack}
              className="mb-6 inline-flex w-fit cursor-pointer items-center gap-[8px] text-[13px] font-medium text-[#A3A3A3] transition-colors hover:text-[#525252]"
            >
              <ArrowLeftIcon />
              {projectBackDestination.label}
            </button>

            <ProjectHeader
              project={project}
              projectImageUrl={live.detail?.projectImageUrl}
              clientAvatarUrl={live.detail?.clientAvatarUrl}
              timeline={timeline}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onShare={() => setIsShareModalOpen(true)}
              onSaveProjectProfile={(input) => runModalAction(() => actions.saveProjectProfile(input))}
              onSaveClientProfile={(input) => runModalAction(() => actions.saveClientProfile(input))}
              onSaveTimeline={(nextTimeline) => runModalAction(() => actions.saveTimeline(nextTimeline))}
              onSavePhases={(phases, deleteTasksInRemovedPhases) =>
                runModalAction(() => actions.savePhases(phases, deleteTasksInRemovedPhases))
              }
              enabledSteps={enabledSteps}
              onSaveWorkflow={(steps) => runModalAction(() => actions.saveWorkflow(steps))}
              skillIds={live.detail?.skillIds ?? NO_SELECTION}
              componentPackIds={live.detail?.componentPackIds ?? NO_SELECTION}
              onSaveSkills={(input) => runModalAction(() => actions.saveSkills(input))}
              onPauseProject={() => runModalAction(() => actions.pauseProject())}
              onCompleteProject={() => runModalAction(() => actions.completeProject())}
              onDeleteProject={runDeleteAction}
              onPrepareProjectMarkerUpload={actions.prepareProjectMarkerUpload}
              onPrepareClientAvatarUpload={actions.prepareClientAvatarUpload}
              modalError={modalError}
              deleteError={deleteError}
            />
          </div>

          {activeTab === "overview" && (
            <div className="w-full pb-[120px] pt-7">
              <KanbanBoard
                phases={project.phases}
                phaseOptions={live.phases}
                projectId={project.id}
                projectName={project.name}
              />

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
                              <Avatar
                                name={profile?.name ?? task.assignees?.[0]?.name ?? "Stage"}
                                src={getRecentActivityAvatarUrl(profile)}
                                className="h-6 w-6"
                              />
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
            <Suspense fallback={<ProjectTabFallback label={PROJECT_STEP_LABELS[activeTab as StepTab]} />}>
              <ProjectStepView
                activeTab={activeTab as StepTab}
                project={project}
                artifactQueriesEnabled={artifactQueriesEnabled}
                pendingStrategyGeneration={pendingStrategyGeneration}
                pendingStrategyProviderId={pendingStrategyProviderId}
                onGenerateStrategy={handleGenerateStrategy}
                onGoToTab={setActiveTab}
                onAutoStartHandled={() => {
                  setPendingStrategyGeneration(false);
                  setPendingStrategyProviderId(null);
                }}
              />
            </Suspense>
          )}
        </motion.div>
      </div>
      {isShareModalOpen ? (
        <ShareModal
          projectId={projectId}
          detail={live.detail}
          onClose={() => setIsShareModalOpen(false)}
        />
      ) : null}
    </>
  );
}

function ProjectTabFallback({ label }: { label: string }) {
  return (
    <div className="flex min-h-[260px] items-center justify-center rounded-[12px] bg-[#f5f5f5] p-4">
      <p className="text-[13px] font-medium text-[#737373]">Loading {label}...</p>
    </div>
  );
}

function ShareModal({
  projectId,
  detail,
  onClose,
}: {
  projectId: string;
  detail: ReturnType<typeof useLiveProject>["detail"];
  onClose: () => void;
}) {
  const share = useProjectShareLink({
    projectId,
    detail,
    open: true,
  });

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
              value={share.isPreparing ? "Preparing link..." : share.shareUrl}
              onFocus={(event) => event.currentTarget.select()}
              onClick={(event) => event.currentTarget.select()}
              className="h-[34px] rounded-[6px] bg-[#F5F5F5] px-[12px] text-[12px] font-medium leading-none text-[#525252] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] outline-none"
            />
            {share.prepareError ? (
              <p className="text-[12px] font-medium text-[#b91c1c]">{share.prepareError}</p>
            ) : null}
          </label>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-[6px] px-[12px] py-[8px] text-[12px] font-medium text-[#525252] transition-colors hover:bg-[#f5f5f5]"
            >
              Done
            </button>
            <button
              type="button"
              disabled={!share.shareUrl || share.isPreparing}
              onClick={() => void share.copyShareUrl()}
              className="rounded-[6px] border border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7B76DF] to-[#463FBA] px-[12px] py-[8px] text-[12px] font-medium text-[#FAFAFA] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {share.copied ? "Copied" : "Copy link"}
            </button>
          </div>

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
  return <img src="/logos/back.svg" alt="" aria-hidden="true" className="h-[16px] w-[16px] shrink-0" />;
}
