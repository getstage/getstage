import { lazy, Suspense } from "react";
import type { ProviderId } from "@stage/data-ops/contracts";
import {
  useFlowsArtifact,
  useMoodboardArtifact,
  useResearchArtifact,
  useStrategyArtifact,
  useWireframesArtifact,
} from "@/hooks/project";
import type { Project, ProjectTab } from "@/models/project/project";

type StepTab = Exclude<ProjectTab, "overview">;

type ProjectStepStatus = Record<StepTab, boolean>;

type ProjectStepViewProps = {
  activeTab: StepTab;
  project: Project;
  artifactQueriesEnabled: boolean;
  pendingStrategyGeneration: boolean;
  pendingStrategyProviderId: ProviderId | null;
  onGenerateStrategy: (providerId: ProviderId) => void;
  onGoToTab: (tab: StepTab) => void;
  onAutoStartHandled: () => void;
};

const PROJECT_STEP_ORDER: StepTab[] = [
  "research",
  "strategy",
  "moodboard",
  "flows",
  "wireframes",
  "assets",
];

const PROJECT_STEP_LABELS: Record<StepTab, string> = {
  research: "Research",
  strategy: "Strategy",
  moodboard: "Moodboard",
  flows: "Flows",
  wireframes: "Wireframes",
  assets: "Assets",
};

const ResearchTab = lazy(() =>
  import("./tabs/research/ResearchTab").then((module) => ({
    default: module.ResearchTab,
  })),
);
const StrategyTab = lazy(() =>
  import("./tabs/strategy/StrategyTab").then((module) => ({
    default: module.StrategyTab,
  })),
);
const MoodboardTab = lazy(() =>
  import("./tabs/moodboard/MoodboardTab").then((module) => ({
    default: module.MoodboardTab,
  })),
);
const FlowsTab = lazy(() =>
  import("./tabs/flows/FlowsTab").then((module) => ({
    default: module.FlowsTab,
  })),
);
const WireframesTab = lazy(() =>
  import("./tabs/wireframes/WireframesTab").then((module) => ({
    default: module.WireframesTab,
  })),
);
const AssetsTab = lazy(() =>
  import("./tabs/assets/AssetsTab").then((module) => ({
    default: module.AssetsTab,
  })),
);

export function ProjectStepView({
  activeTab,
  project,
  artifactQueriesEnabled,
  pendingStrategyGeneration,
  pendingStrategyProviderId,
  onGenerateStrategy,
  onGoToTab,
  onAutoStartHandled,
}: ProjectStepViewProps) {
  const shouldCheckResearchArtifact = artifactQueriesEnabled;
  const shouldCheckStrategyArtifact =
    artifactQueriesEnabled &&
    (activeTab === "moodboard" ||
      activeTab === "flows" ||
      activeTab === "wireframes" ||
      activeTab === "assets");
  const shouldCheckMoodboardArtifact =
    artifactQueriesEnabled &&
    (activeTab === "flows" || activeTab === "wireframes" || activeTab === "assets");
  const shouldCheckFlowsArtifact =
    artifactQueriesEnabled && (activeTab === "wireframes" || activeTab === "assets");
  const shouldCheckWireframesArtifact = artifactQueriesEnabled && activeTab === "assets";
  const researchArtifact = useResearchArtifact(project.id, { enabled: shouldCheckResearchArtifact });
  const strategyArtifact = useStrategyArtifact(project.id, { enabled: shouldCheckStrategyArtifact });
  const moodboardArtifact = useMoodboardArtifact(project.id, { enabled: shouldCheckMoodboardArtifact });
  const flowsArtifact = useFlowsArtifact(project.id, { enabled: shouldCheckFlowsArtifact });
  const wireframesArtifact = useWireframesArtifact(project.id, { enabled: shouldCheckWireframesArtifact });
  const stepStatus: ProjectStepStatus = {
    research: activeTab === "research" || researchArtifact.hasArtifact || researchArtifact.isLoading,
    strategy: activeTab === "strategy" || strategyArtifact.hasArtifact,
    moodboard: activeTab === "moodboard" || moodboardArtifact.hasArtifact,
    flows: activeTab === "flows" || flowsArtifact.hasArtifact,
    wireframes: activeTab === "wireframes" || wireframesArtifact.hasArtifact,
    assets: true,
  };
  const blockedStep = getBlockedProjectStep(activeTab, stepStatus);

  return (
    <div className="w-full pb-[120px] pt-7">
      <Suspense fallback={<ProjectTabFallback label={PROJECT_STEP_LABELS[activeTab]} />}>
        {blockedStep ? (
          <ProjectStepBlockedState
            currentTab={activeTab}
            requiredTab={blockedStep}
            onGoToStep={() => onGoToTab(blockedStep)}
          />
        ) : null}
        {!blockedStep && activeTab === "research" ? (
          <ResearchTab project={project} onGenerateStrategy={onGenerateStrategy} />
        ) : null}
        {!blockedStep && activeTab === "strategy" ? (
          <StrategyTab
            project={project}
            onGoToResearch={() => onGoToTab("research")}
            onGoToMoodboard={() => onGoToTab("moodboard")}
            autoStartGeneration={pendingStrategyGeneration}
            pendingStrategyProviderId={pendingStrategyProviderId}
            onAutoStartHandled={onAutoStartHandled}
          />
        ) : null}
        {!blockedStep && activeTab === "moodboard" ? (
          <MoodboardTab
            key={project.id}
            project={project}
            onGoToResearch={() => onGoToTab("research")}
            onGoToStrategy={() => onGoToTab("strategy")}
            onGoToFlows={() => onGoToTab("flows")}
          />
        ) : null}
        {!blockedStep && activeTab === "flows" ? (
          <FlowsTab
            project={project}
            onGoToResearch={() => onGoToTab("research")}
            onGoToStrategy={() => onGoToTab("strategy")}
          />
        ) : null}
        {!blockedStep && activeTab === "wireframes" ? (
          <WireframesTab
            project={project}
            onGoToResearch={() => onGoToTab("research")}
            onGoToStrategy={() => onGoToTab("strategy")}
            onGoToFlows={() => onGoToTab("flows")}
            onGoToMoodboard={() => onGoToTab("moodboard")}
          />
        ) : null}
        {!blockedStep && activeTab === "assets" ? <AssetsTab project={project} /> : null}
      </Suspense>
    </div>
  );
}

function ProjectTabFallback({ label }: { label: string }) {
  return (
    <div className="flex min-h-[260px] items-center justify-center rounded-[12px] bg-[#f5f5f5] p-4">
      <p className="text-[13px] font-medium text-[#737373]">Loading {label}...</p>
    </div>
  );
}

function getBlockedProjectStep(activeTab: StepTab, stepStatus: ProjectStepStatus): StepTab | null {
  if (activeTab === "research" || activeTab === "assets") {
    return null;
  }

  const activeIndex = PROJECT_STEP_ORDER.indexOf(activeTab);
  if (activeIndex <= 0) {
    return null;
  }

  for (const step of PROJECT_STEP_ORDER.slice(0, activeIndex)) {
    if (!stepStatus[step]) {
      return step;
    }
  }

  return null;
}

function ProjectStepBlockedState({
  currentTab,
  requiredTab,
  onGoToStep,
}: {
  currentTab: StepTab;
  requiredTab: StepTab;
  onGoToStep: () => void;
}) {
  const currentLabel = PROJECT_STEP_LABELS[currentTab];
  const requiredLabel = PROJECT_STEP_LABELS[requiredTab];

  return (
    <section className="rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
      <div className="rounded-[8px] bg-white shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
        <div className="flex w-full flex-col gap-1 rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
          <div className="flex items-center justify-center p-4">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <p className="text-[15px] font-medium leading-none text-[#171717]">
                {currentLabel}
              </p>
              <p className="max-w-[460px] text-[12px] font-medium leading-[1.5] text-[#737373]">
                This project moves step by step. Complete {requiredLabel} before proceeding to {currentLabel}.
              </p>
            </div>
          </div>

          <div className="rounded-[8px] bg-white px-11 py-11 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
            <div className="flex max-w-[460px] flex-col gap-6">
              <div className="flex flex-col gap-2">
                <p className="text-[20px] font-semibold leading-[1.2] text-[#171717]">
                  Complete {requiredLabel} first
                </p>
                <p className="text-[13px] font-medium leading-[1.6] text-[#737373]">
                  {currentLabel} depends on the work from {requiredLabel}. Finish that step and this tab will become available.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={onGoToStep}
                  className="inline-flex h-8 items-center justify-center gap-2 rounded-[6px] border border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7B76DF] to-[#463FBA] px-3 text-[13px] font-medium leading-[1.25] text-[#FAFAFA] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-opacity hover:opacity-95"
                >
                  Go to {requiredLabel}
                  <ArrowRightIconSmall />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ArrowRightIconSmall() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="h-4 w-4">
      <path d="M3.5 8h8.25M8.75 5l3 3-3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
