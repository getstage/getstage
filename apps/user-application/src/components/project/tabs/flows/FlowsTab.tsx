import { useEffect, useMemo, useState } from "react";
import { UpstreamStaleBanner } from "@/components/project/UpstreamStaleBanner";
import {
  createSeedFlows,
  createSeedScreens,
  getDefaultExpandedFlowId,
} from "@/data/fixtures/project/flowsTabFixtures";
import { useFlowsTab } from "@/hooks/project";
import type { Project, ProjectFlow } from "@/models/project/project";
import {
  EMPTY_ADD_FLOW,
  type AddFlowStep,
  type FlowPanelTab,
} from "@/types/project/flowsTab";
import { AddFlowModal } from "./AddFlowModal";
import { FlowHeaderActions } from "./FlowHeaderActions";
import { FlowRow } from "./FlowRow";
import { FlowIcon, ScreenIcon } from "./flowsIcons";
import { ScreenFilter } from "./ScreenFilter";
import { ScreensPanel } from "./ScreensPanel";

type FlowsTabProps = {
  project: Project;
  onGoToResearch?: () => void;
  onGoToStrategy?: () => void;
};

export function FlowsTab({ project, onGoToResearch, onGoToStrategy }: FlowsTabProps) {
  const flowsTab = useFlowsTab({ id: project.id, name: project.name });
  const initialFlows = useMemo(
    () => (project.flows.length > 0 ? project.flows : createSeedFlows()),
    [project.flows],
  );
  const initialScreens = useMemo(
    () => (project.screens && project.screens.length > 0 ? project.screens : createSeedScreens()),
    [project.screens],
  );
  const [flows, setFlows] = useState<ProjectFlow[]>(initialFlows);
  const [screens, setScreens] = useState(initialScreens);
  const [activePanelTab, setActivePanelTab] = useState<FlowPanelTab>("flows");
  const [expandedFlowId, setExpandedFlowId] = useState<string | null>(() => getDefaultExpandedFlowId(initialFlows));
  const [editingFlowId, setEditingFlowId] = useState<string | null>(null);
  const [editingScreenId, setEditingScreenId] = useState<string | null>(null);
  const [draftSteps, setDraftSteps] = useState<Record<string, string[]>>({});
  const [draftScreenElements, setDraftScreenElements] = useState<Record<string, string[]>>({});
  const [regeneratingScreenTitle, setRegeneratingScreenTitle] = useState<string | null>(null);
  const [addFlowOpen, setAddFlowOpen] = useState(false);
  const [addFlowStep, setAddFlowStep] = useState<AddFlowStep>("details");
  const [addFlowDraft, setAddFlowDraft] = useState(EMPTY_ADD_FLOW);
  const [newStepDraft, setNewStepDraft] = useState("");

  useEffect(() => {
    if (flowsTab.data?.tabData) {
      const { tabData } = flowsTab.data;
      setFlows(tabData.flows);
      setScreens(tabData.screens);
      setExpandedFlowId(getDefaultExpandedFlowId(tabData.flows));
      setEditingFlowId(null);
      setEditingScreenId(null);
      setDraftSteps({});
      setDraftScreenElements({});
      return;
    }

    setFlows(initialFlows);
    setScreens(initialScreens);
    setExpandedFlowId(getDefaultExpandedFlowId(initialFlows));
    setEditingFlowId(null);
    setEditingScreenId(null);
    setDraftSteps({});
    setDraftScreenElements({});
  }, [flowsTab.data, initialFlows, initialScreens]);

  const approvedCount = flows.filter((flow) => flow.status.toLowerCase() === "approved").length;
  const flowTotal = flows.length;
  const screenTotal = flows.reduce((total, flow) => total + (flow.screenCount ?? 0), 0);
  const progress = flowTotal > 0 ? (approvedCount / flowTotal) * 100 : 0;

  const toggleFlow = (flowId: string) => {
    const willCloseCurrentFlow = expandedFlowId === flowId;
    setExpandedFlowId(willCloseCurrentFlow ? null : flowId);
    setEditingFlowId(null);
  };

  const beginEdit = (flow: ProjectFlow) => {
    setExpandedFlowId(flow.id);
    setEditingFlowId(flow.id);
    setDraftSteps((currentDrafts) => ({
      ...currentDrafts,
      [flow.id]: [...(flow.steps ?? [])],
    }));
  };

  const updateDraftStep = (flowId: string, stepIndex: number, value: string) => {
    setDraftSteps((currentDrafts) => {
      const currentSteps = currentDrafts[flowId] ?? flows.find((flow) => flow.id === flowId)?.steps ?? [];
      return {
        ...currentDrafts,
        [flowId]: currentSteps.map((step, index) => (index === stepIndex ? value : step)),
      };
    });
  };

  const saveDraft = (flowId: string) => {
    setFlows((currentFlows) =>
      currentFlows.map((flow) => {
        if (flow.id !== flowId) return flow;
        const savedSteps = (draftSteps[flowId] ?? flow.steps ?? []).map((step) => step.trim()).filter(Boolean);
        return {
          ...flow,
          steps: savedSteps,
          screenCount: savedSteps.length > 0 ? savedSteps.length - 1 : flow.screenCount,
        };
      }),
    );
    setEditingFlowId(null);
  };

  const discardDraft = (flowId: string) => {
    setDraftSteps((currentDrafts) => {
      const { [flowId]: _discarded, ...nextDrafts } = currentDrafts;
      return nextDrafts;
    });
    setEditingFlowId(null);
  };

  const closeAddFlow = () => {
    setAddFlowOpen(false);
    setAddFlowStep("details");
    setAddFlowDraft(EMPTY_ADD_FLOW);
    setNewStepDraft("");
  };

  const addManualStep = () => {
    const nextStep = newStepDraft.trim();
    if (!nextStep) return;
    setAddFlowDraft((currentDraft) => ({
      ...currentDraft,
      steps: [...currentDraft.steps, nextStep],
    }));
    setNewStepDraft("");
  };

  const createManualFlow = () => {
    const title = addFlowDraft.title.trim();
    if (!title || addFlowDraft.steps.length === 0) return;

    const newFlow: ProjectFlow = {
      id: `flow-${Date.now()}`,
      title,
      description: addFlowDraft.description.trim() || "Manual flow added from the project flows workspace",
      status: "Draft",
      category: addFlowDraft.category.trim() || "Custom",
      steps: addFlowDraft.steps,
      screenCount: Math.max(addFlowDraft.steps.length - 1, 1),
    };

    setFlows((currentFlows) => [newFlow, ...currentFlows]);
    setActivePanelTab("flows");
    setExpandedFlowId(newFlow.id);
    closeAddFlow();
  };

  async function regenerateScreenElements(screenId: string, screenTitle: string) {
    setRegeneratingScreenTitle(screenTitle);
    await delay(900);
    setDraftScreenElements((currentDrafts) => {
      const currentElements = currentDrafts[screenId] ?? screens.find((screen) => screen.id === screenId)?.keyElements ?? [];
      return {
        ...currentDrafts,
        [screenId]: currentElements.map((element) => `${element} - regenerated`),
      };
    });
    setRegeneratingScreenTitle(null);
  }

  if (regeneratingScreenTitle) {
    return <FlowsRegeneratingState screenTitle={regeneratingScreenTitle} />;
  }

  return (
    <>
      <UpstreamStaleBanner
        projectId={project.id}
        onGoToResearch={onGoToResearch}
        onGoToStrategy={onGoToStrategy}
      />
      <section className="overflow-hidden rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
        <div className="flex flex-col gap-4 p-4">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div className="min-w-0">
              <h2 className="font-heading text-[15px] font-medium leading-[1.25] text-[#171717]">
                Flows
              </h2>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-[13px] font-medium leading-[1.25] text-[#171717]">
                <div className="h-[10px] w-[65px] overflow-hidden rounded-full bg-[#E5E5E5]">
                  <div
                    className="h-full rounded-full bg-[#16A34A]"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span>{approvedCount} of {flowTotal} flows approved</span>
                <span className="h-1 w-1 rounded-full bg-[#D4D4D4]" aria-hidden="true" />
                <span className="text-[#737373]">{screenTotal} Unique screens identified</span>
              </div>
            </div>

            {activePanelTab === "flows" ? <FlowHeaderActions onAddFlow={() => setAddFlowOpen(true)} /> : null}
          </div>

          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-1 rounded-[8px] bg-white p-[2px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
              <button
                type="button"
                onClick={() => setActivePanelTab("flows")}
                className={`inline-flex h-[32px] items-center gap-2 rounded-[6px] px-3 text-[13px] font-medium leading-[1.25] transition-colors ${
                  activePanelTab === "flows"
                    ? "bg-[#E5E5E5] text-[#171717] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]"
                    : "text-[#737373] hover:bg-[#F5F5F5]"
                }`}
              >
                <FlowIcon />
                Flows
                <span className="text-[#737373]">({flowTotal})</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActivePanelTab("screens");
                  setEditingFlowId(null);
                }}
                className={`inline-flex h-[32px] items-center gap-2 rounded-[6px] px-3 text-[13px] font-medium leading-[1.25] transition-colors ${
                  activePanelTab === "screens"
                    ? "bg-[#E5E5E5] text-[#171717] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]"
                    : "text-[#737373] hover:bg-[#F5F5F5]"
                }`}
              >
                <ScreenIcon />
                Screens
                <span>({screenTotal})</span>
              </button>
            </div>

            {activePanelTab === "screens" ? <ScreenFilter screenTotal={screenTotal} /> : null}
          </div>

          {activePanelTab === "flows" ? (
            <div className="flex flex-col gap-1">
              {flows.map((flow, index) => (
                <FlowRow
                  key={flow.id}
                  flow={flow}
                  index={index + 1}
                  expanded={expandedFlowId === flow.id}
                  editing={editingFlowId === flow.id}
                  draftSteps={draftSteps[flow.id] ?? flow.steps ?? []}
                  onToggle={() => toggleFlow(flow.id)}
                  onBeginEdit={() => beginEdit(flow)}
                  onDraftStepChange={(stepIndex, value) => updateDraftStep(flow.id, stepIndex, value)}
                  onDiscard={() => discardDraft(flow.id)}
                  onSave={() => saveDraft(flow.id)}
                />
              ))}
            </div>
          ) : (
            <ScreensPanel
              screens={screens}
              editingScreenId={editingScreenId}
              draftScreenElements={draftScreenElements}
              onBeginEdit={(screen) => {
                setEditingScreenId(screen.id);
                setDraftScreenElements((currentDrafts) => ({
                  ...currentDrafts,
                  [screen.id]: [...screen.keyElements],
                }));
              }}
              onDraftElementChange={(screenId, elementIndex, value) => {
                setDraftScreenElements((currentDrafts) => {
                  const currentElements = currentDrafts[screenId] ?? screens.find((screen) => screen.id === screenId)?.keyElements ?? [];
                  return {
                    ...currentDrafts,
                    [screenId]: currentElements.map((element, index) => (index === elementIndex ? value : element)),
                  };
                });
              }}
              onRegenerate={(screen) => {
                void regenerateScreenElements(screen.id, screen.title);
              }}
              onDiscard={(screenId) => {
                setDraftScreenElements((currentDrafts) => {
                  const { [screenId]: _discarded, ...nextDrafts } = currentDrafts;
                  return nextDrafts;
                });
                setEditingScreenId(null);
              }}
              onSave={(screenId) => {
                setScreens((currentScreens) =>
                  currentScreens.map((screen) => {
                    if (screen.id !== screenId) return screen;
                    return {
                      ...screen,
                      keyElements: (draftScreenElements[screenId] ?? screen.keyElements)
                        .map((element) => element.trim())
                        .filter(Boolean),
                    };
                  }),
                );
                setEditingScreenId(null);
              }}
            />
          )}
        </div>
      </section>

      {addFlowOpen ? (
        <AddFlowModal
          step={addFlowStep}
          draft={addFlowDraft}
          newStepDraft={newStepDraft}
          onClose={closeAddFlow}
          onDraftChange={(patch) => setAddFlowDraft((currentDraft) => ({ ...currentDraft, ...patch }))}
          onNext={() => setAddFlowStep("steps")}
          onNewStepChange={setNewStepDraft}
          onAddStep={addManualStep}
          onSave={createManualFlow}
        />
      ) : null}
    </>
  );
}

function FlowsRegeneratingState({ screenTitle }: { screenTitle: string }) {
  return (
    <section className="overflow-hidden rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
      <div className="rounded-[8px] bg-white px-[44px] py-[44px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
        <div className="flex min-h-[520px] items-center justify-center">
          <div className="flex w-full max-w-[282px] flex-col items-center gap-6">
            <img src="/logos/dashboard/flows.svg" alt="" aria-hidden="true" className="h-[37px] w-[37px]" />

            <div className="flex w-full flex-col items-center gap-2">
              <p className="text-center text-[16px] font-semibold leading-none text-[#171717]">
                Regenerating {screenTitle}
              </p>
              <p className="text-center text-[13px] font-medium leading-[1.5] text-[#525252]">
                Refreshing the key elements for this screen from the current flow context.
              </p>
            </div>

            <div className="flex w-full flex-col items-center gap-2">
              <LoadingStep icon="/logos/check.svg" label="Screen context loaded" />
              <LoadingStep icon="/logos/check.svg" label="Related flows attached" />
              <LoadingStep icon="/logos/loader.svg" label="Generating key elements" spinning />
              <LoadingStep icon="/logos/unchecked.svg" label="Updating screen card" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function LoadingStep({ icon, label, spinning = false }: { icon: string; label: string; spinning?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <img
        src={icon}
        alt=""
        aria-hidden="true"
        className={`${spinning ? "h-[16px] w-[16px] animate-spin" : "h-[18px] w-[18px]"} shrink-0`}
      />
      <p className="text-center text-[13px] font-medium leading-[1.5] text-[#525252]">{label}</p>
    </div>
  );
}

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}
