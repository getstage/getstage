import { useEffect, useMemo, useRef, useState } from "react";
import type { ProviderId } from "@stage/data-ops/contracts";
import { GenerateStrategyRunDialog } from "@/components/project/GenerateStrategyRunDialog";
import { UpstreamStaleBanner } from "@/components/project/UpstreamStaleBanner";
import { getDefaultExpandedFlowId } from "@/data/fixtures/project/flowsTabFixtures";
import {
  useFlowsFigJamExport,
  useFlowsRun,
  useFlowsTab,
  useProjectAiProvider,
  useSaveFlowsArtifact,
} from "@/hooks/project";
import type { Project, ProjectFlow } from "@/models/project/project";
import {
  EMPTY_ADD_FLOW,
  type AddFlowStep,
  type FlowPanelTab,
} from "@/types/project/flowsTab";
import { AddFlowModal } from "./AddFlowModal";
import { FigJamExportDialog } from "./FigJamExportDialog";
import { FlowHeaderActions } from "./FlowHeaderActions";
import { FlowRow } from "./FlowRow";
import { FlowIcon, ScreenIcon } from "./flowsIcons";
import { ScreenFilter } from "./ScreenFilter";
import { ScreensPanel } from "./ScreensPanel";
import { TabLoadingState } from "../TabLoadingState";

type FlowsTabProps = {
  project: Project;
  onGoToResearch?: () => void;
  onGoToStrategy?: () => void;
};

export function FlowsTab({ project, onGoToResearch, onGoToStrategy }: FlowsTabProps) {
  const flowsTab = useFlowsTab({ id: project.id, name: project.name });
  const flowsRun = useFlowsRun(project.id);
  const saveFlows = useSaveFlowsArtifact(project.id);
  const figJamExport = useFlowsFigJamExport(project.id);
  const aiProvider = useProjectAiProvider(project.id);
  const artifactRecord = flowsTab.data;
  const initialFlows = useMemo(() => artifactRecord?.tabData.flows ?? [], [artifactRecord]);
  const initialScreens = useMemo(() => artifactRecord?.tabData.screens ?? [], [artifactRecord]);
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
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [uiError, setUiError] = useState<string | null>(null);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    if (artifactRecord?.tabData) {
      const { tabData } = artifactRecord;
      setFlows(tabData.flows);
      setScreens(tabData.screens);
      setExpandedFlowId(getDefaultExpandedFlowId(tabData.flows));
      setEditingFlowId(null);
      setEditingScreenId(null);
      setDraftSteps({});
      setDraftScreenElements({});
      return;
    }

    setFlows([]);
    setScreens([]);
    setExpandedFlowId(null);
    setEditingFlowId(null);
    setEditingScreenId(null);
    setDraftSteps({});
    setDraftScreenElements({});
  }, [artifactRecord]);

  useEffect(() => {
    if (!regeneratingScreenTitle) return;
    const hasTerminalEvent = flowsRun.runEvents.some(
      (event) =>
        event.type === "run_completed" ||
        event.type === "run_failed" ||
        event.type === "run_cancelled",
    );
    if (hasTerminalEvent) {
      setRegeneratingScreenTitle(null);
    }
  }, [flowsRun.runEvents, regeneratingScreenTitle]);

  const approvedCount = flows.filter((flow) => flow.status.toLowerCase() === "approved").length;
  const flowTotal = flows.length;
  const screenTotal = screens.length;
  const progress = flowTotal > 0 ? (approvedCount / flowTotal) * 100 : 0;
  const flowRunBusy = flowsRun.isRunning || flowsRun.isStarting;
  const visibleRunError = artifactRecord ? null : flowsRun.error;

  async function persist(nextFlows: ProjectFlow[], nextScreens = screens) {
    if (!artifactRecord) {
      throw new Error("Generate flows before saving changes.");
    }

    const saveTask = () => saveFlows.saveFlowsArtifact(artifactRecord, nextFlows, nextScreens);
    const nextSave = saveQueueRef.current.then(saveTask, saveTask).then(() => undefined);
    saveQueueRef.current = nextSave.catch(() => undefined);
    await nextSave;
  }

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
    const nextFlows = flows.map((flow) => {
        if (flow.id !== flowId) return flow;
        const savedSteps = (draftSteps[flowId] ?? flow.steps ?? []).map((step) => step.trim()).filter(Boolean);
        return {
          ...flow,
          steps: savedSteps,
          screenCount: savedSteps.length > 0 ? savedSteps.length - 1 : flow.screenCount,
        };
      });
    setFlows(nextFlows);
    setEditingFlowId(null);
    void persist(nextFlows).catch((error) => {
      setUiError(error instanceof Error ? error.message : "Could not save flow steps.");
    });
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

    const nextFlows = [newFlow, ...flows];
    setFlows(nextFlows);
    setActivePanelTab("flows");
    setExpandedFlowId(newFlow.id);
    closeAddFlow();
    void persist(nextFlows).catch((error) => {
      setUiError(error instanceof Error ? error.message : "Could not save manual flow.");
    });
  };

  async function regenerateScreenElements(screenId: string, screenTitle: string) {
    if (flowRunBusy) return;

    const providerId = aiProvider.resolvedProviderId;
    if (!providerId) {
      setUiError("Choose a connected provider before regenerating a screen.");
      return;
    }

    setRegeneratingScreenTitle(screenTitle);
    try {
      await flowsRun.startFlows(providerId, `screen:${screenId}`);
    } catch (error) {
      setUiError(error instanceof Error ? error.message : "Could not regenerate screen.");
      setRegeneratingScreenTitle(null);
    }
  }

  async function regenerateFlow(flowId: string) {
    if (flowRunBusy) return;

    const providerId = aiProvider.resolvedProviderId;
    if (!providerId) {
      setUiError("Choose a connected provider before regenerating a flow.");
      return;
    }

    try {
      await flowsRun.startFlows(providerId, `flow:${flowId}`);
    } catch (error) {
      setUiError(error instanceof Error ? error.message : "Could not regenerate flow.");
    }
  }

  async function generateFlows(providerId: ProviderId) {
    if (flowRunBusy) return;

    setUiError(null);
    try {
      await flowsRun.startFlows(providerId);
      setGenerateDialogOpen(false);
    } catch (error) {
      setUiError(error instanceof Error ? error.message : "Could not generate flows.");
    }
  }

  function updateFlowStatus(flowId: string, status: "Draft" | "In Review" | "Approved") {
    const nextFlows = flows.map((flow) => (flow.id === flowId ? { ...flow, status } : flow));
    setFlows(nextFlows);
    void persist(nextFlows).catch((error) => {
      setUiError(error instanceof Error ? error.message : "Could not update flow status.");
    });
  }

  async function handleSendToFigJam() {
    if (!artifactRecord) return;
    setUiError(null);
    try {
      await figJamExport.sendToFigJam(artifactRecord.id);
    } catch (error) {
      setUiError(error instanceof Error ? error.message : "Could not send flows to FigJam.");
    }
  }

  if (flowsTab.isLoading) {
    return <TabLoadingState label="Loading flows…" />;
  }

  if (!artifactRecord && (flowsRun.isRunning || flowsRun.isStarting)) {
    return <FlowsGeneratingState />;
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
      {!artifactRecord ? (
        <>
          <FlowsEmptyState
            isRunning={flowsRun.isRunning || flowsRun.isStarting}
            error={uiError ?? visibleRunError ?? (flowsTab.parseError ? "Saved flows could not be loaded." : null)}
            onGenerate={() => setGenerateDialogOpen(true)}
          />
          <GenerateStrategyRunDialog
            open={generateDialogOpen}
            onOpenChange={setGenerateDialogOpen}
            title="Generate Flows"
            description="Turn your research, strategy and moodboard direction into editable project flows."
            confirmLabel="Generate Flows"
            isSubmitting={flowRunBusy}
            providerOptions={aiProvider.providerOptions}
            selectedProviderId={aiProvider.resolvedProviderId}
            onSelectProvider={aiProvider.selectProvider}
            onConfirm={(providerId) => void generateFlows(providerId)}
          />
        </>
      ) : null}
      {artifactRecord ? (
      <section className="overflow-hidden rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
        <div className="flex flex-col gap-4 p-4">
          {uiError || figJamExport.error ? (
            <div className={`rounded-[8px] px-3 py-2 text-[12px] font-medium leading-[1.5] ${
              "bg-[#FEF2F2] text-[#991B1B]"
            }`}>
              {uiError ?? figJamExport.error}
            </div>
          ) : null}
          <FigJamExportDialog
            open={figJamExport.request !== null}
            onOpenChange={(open) => { if (!open) figJamExport.clearResult(); }}
            request={figJamExport.request}
            jobStatus={figJamExport.job?.status}
            destinationUrl={figJamExport.job?.destinationUrl}
            errorMessage={figJamExport.job?.errorMessage}
          />
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

            {activePanelTab === "flows" ? (
              <FlowHeaderActions
                onAddFlow={() => setAddFlowOpen(true)}
                onSendToFigJam={() => void handleSendToFigJam()}
                sendingToFigJam={figJamExport.isExporting}
              />
            ) : null}
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
                  regenerating={flowRunBusy}
                  draftSteps={draftSteps[flow.id] ?? flow.steps ?? []}
                  onToggle={() => toggleFlow(flow.id)}
                  onBeginEdit={() => beginEdit(flow)}
                  onRegenerate={() => void regenerateFlow(flow.id)}
                  onDraftStepChange={(stepIndex, value) => updateDraftStep(flow.id, stepIndex, value)}
                  onStatusChange={(status) => updateFlowStatus(flow.id, status)}
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
              regenerating={flowRunBusy}
              onDiscard={(screenId) => {
                setDraftScreenElements((currentDrafts) => {
                  const { [screenId]: _discarded, ...nextDrafts } = currentDrafts;
                  return nextDrafts;
                });
                setEditingScreenId(null);
              }}
              onSave={(screenId) => {
                const nextScreens = screens.map((screen) => {
                    if (screen.id !== screenId) return screen;
                    return {
                      ...screen,
                      keyElements: (draftScreenElements[screenId] ?? screen.keyElements)
                        .map((element) => element.trim())
                        .filter(Boolean),
                    };
                  });
                setScreens(nextScreens);
                setEditingScreenId(null);
                void persist(flows, nextScreens).catch((error) => {
                  setUiError(error instanceof Error ? error.message : "Could not save screen elements.");
                });
              }}
            />
          )}
        </div>
      </section>
      ) : null}

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

function FlowsEmptyState({
  isRunning,
  error,
  onGenerate,
}: {
  isRunning: boolean;
  error: string | null;
  onGenerate: () => void;
}) {
  return (
    <section className="overflow-hidden rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
      <div className="rounded-[8px] bg-white px-[44px] py-[44px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
        <div className="flex min-h-[420px] items-center justify-center">
          <div className="flex w-full max-w-[420px] flex-col items-center gap-5 text-center">
            <img src="/logos/dashboard/flows.svg" alt="" aria-hidden="true" className="h-[37px] w-[37px]" />
            <div className="flex flex-col gap-2">
              <h2 className="text-[20px] font-semibold leading-[1.2] text-[#171717]">
                Generate project flows
              </h2>
              <p className="text-[13px] font-medium leading-[1.5] text-[#525252]">
                Turn approved research, strategy and moodboard direction into editable user flows and reusable screens.
              </p>
            </div>
            {error ? (
              <p className="rounded-[8px] bg-[#FEF2F2] px-3 py-2 text-[12px] font-medium leading-[1.5] text-[#991B1B]">
                {error}
              </p>
            ) : null}
            <button
              type="button"
              onClick={onGenerate}
              disabled={isRunning}
              className="inline-flex h-[34px] items-center gap-2 rounded-[6px] border border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7B76DF] to-[#463FBA] pl-[10px] pr-3 text-[13px] font-medium leading-none text-[#FAFAFA] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <img src="/logos/dashboard/ai-generated.svg" alt="" aria-hidden="true" className="h-[15px] w-[15px] brightness-0 invert" />
              {isRunning ? "Generating..." : "Generate Flows"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function FlowsGeneratingState() {
  return (
    <section className="overflow-hidden rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
      <div className="rounded-[8px] bg-white px-[44px] py-[44px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
        <div className="flex min-h-[520px] items-center justify-center">
          <div className="flex w-full max-w-[282px] flex-col items-center gap-6">
            <img src="/logos/dashboard/flows.svg" alt="" aria-hidden="true" className="h-[37px] w-[37px]" />
            <div className="flex w-full flex-col items-center gap-2">
              <p className="text-center text-[16px] font-semibold leading-none text-[#171717]">
                Generating Flows
              </p>
              <p className="text-center text-[13px] font-medium leading-[1.5] text-[#525252]">
                Turning your project intelligence into editable journeys and screens.
              </p>
            </div>
            <div className="flex w-full flex-col items-center gap-2">
              <LoadingStep icon="/logos/check.svg" label="Project context loaded" />
              <LoadingStep icon="/logos/check.svg" label="Research attached" />
              <LoadingStep icon="/logos/check.svg" label="Strategy attached" />
              <LoadingStep icon="/logos/check.svg" label="Moodboard direction attached" />
              <LoadingStep icon="/logos/loader.svg" label="Generating flows" spinning />
              <LoadingStep icon="/logos/unchecked.svg" label="Saving artifact" />
            </div>
          </div>
        </div>
      </div>
    </section>
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
