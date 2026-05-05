import { useState, type ReactNode } from "react";
import type { Project, ProjectFlow, ProjectScreen } from "../../models/project";

type FlowPanelTab = "flows" | "screens";
type AddFlowStep = "details" | "steps";

const EMPTY_ADD_FLOW = {
  title: "Baseframe",
  description: "",
  category: "",
  steps: [] as string[],
};

export function FlowsTab({ project }: { project: Project }) {
  const [flows, setFlows] = useState<ProjectFlow[]>(project.flows);
  const [screens, setScreens] = useState<ProjectScreen[]>(project.screens ?? []);
  const [activePanelTab, setActivePanelTab] = useState<FlowPanelTab>("flows");
  const [expandedFlowId, setExpandedFlowId] = useState<string | null>(project.flows[0]?.id ?? null);
  const [editingFlowId, setEditingFlowId] = useState<string | null>(null);
  const [editingScreenId, setEditingScreenId] = useState<string | null>(null);
  const [draftSteps, setDraftSteps] = useState<Record<string, string[]>>({});
  const [draftScreenElements, setDraftScreenElements] = useState<Record<string, string[]>>({});
  const [addFlowOpen, setAddFlowOpen] = useState(false);
  const [addFlowStep, setAddFlowStep] = useState<AddFlowStep>("details");
  const [addFlowDraft, setAddFlowDraft] = useState(EMPTY_ADD_FLOW);
  const [newStepDraft, setNewStepDraft] = useState("");

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

  return (
    <>
      <section className="overflow-hidden rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
        <div className="flex flex-col gap-4 p-4">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div className="min-w-0">
              <h2 className="font-heading text-[15px] font-medium leading-none text-[#171717]">
                Flows
              </h2>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-[13px] font-medium leading-none text-[#171717]">
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
                className={`inline-flex h-[32px] items-center gap-2 rounded-[6px] px-3 text-[13px] font-medium leading-none transition-colors ${
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
                className={`inline-flex h-[32px] items-center gap-2 rounded-[6px] px-3 text-[13px] font-medium leading-none transition-colors ${
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

function FlowHeaderActions({ onAddFlow }: { onAddFlow: () => void }) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <button
        type="button"
        onClick={onAddFlow}
        className="inline-flex h-[32px] items-center gap-2 rounded-[6px] bg-white px-3 text-[13px] font-medium leading-none text-[#525252] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#FAFAFA]"
      >
        <PlusIcon />
        Add a flow manually
      </button>
      <button
        type="button"
        className="inline-flex h-[32px] items-center gap-2 rounded-[6px] bg-gradient-to-b from-[#262626] to-[#0A0A0A] px-3 text-[13px] font-medium leading-none text-white shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-opacity hover:opacity-90"
      >
        <FigmaIcon />
        Send to FigJam
      </button>
    </div>
  );
}

function ScreenFilter({ screenTotal }: { screenTotal: number }) {
  return (
    <button
      type="button"
      className="inline-flex h-[32px] items-center gap-1 rounded-[6px] bg-white py-2 pl-3 pr-[14px] text-[13px] font-medium leading-none text-[#404040] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#FAFAFA]"
    >
      <span>All</span>
      <span className="opacity-50">({screenTotal})</span>
      <ChevronDownIcon />
    </button>
  );
}

function AddFlowModal({
  step,
  draft,
  newStepDraft,
  onClose,
  onDraftChange,
  onNext,
  onNewStepChange,
  onAddStep,
  onSave,
}: {
  step: AddFlowStep;
  draft: typeof EMPTY_ADD_FLOW;
  newStepDraft: string;
  onClose: () => void;
  onDraftChange: (patch: Partial<typeof EMPTY_ADD_FLOW>) => void;
  onNext: () => void;
  onNewStepChange: (value: string) => void;
  onAddStep: () => void;
  onSave: () => void;
}) {
  const canContinue = draft.title.trim().length > 0 && draft.category.trim().length > 0;
  const canSave = draft.steps.length > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.1)] backdrop-blur-[5px]"
      role="dialog"
      aria-modal="true"
      aria-label={step === "details" ? "Add Flow Manually" : "Add Steps"}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="w-[516px] rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
        {step === "details" ? (
          <>
            <div className="flex items-center justify-center px-3 pb-3 pt-2">
              <h3 className="text-[13px] font-semibold leading-[1.5] text-[#0A0A0A]">
                Add Flow Manually
              </h3>
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex flex-col gap-4 rounded-[8px] bg-white p-3 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
                <Field label="Flow Title">
                  <input
                    value={draft.title}
                    onChange={(event) => onDraftChange({ title: event.target.value })}
                    className={fieldClassName}
                    placeholder="Baseframe"
                  />
                </Field>
                <Field label="Flow Description">
                  <textarea
                    value={draft.description}
                    onChange={(event) => onDraftChange({ description: event.target.value })}
                    className={`${fieldClassName} h-[67px] resize-none items-start`}
                    placeholder="Type here..."
                  />
                </Field>
                <Field label="Flow Type">
                  <div className="relative w-full">
                    <select
                      value={draft.category}
                      onChange={(event) => onDraftChange({ category: event.target.value })}
                      className={`${fieldClassName} appearance-none pr-9`}
                    >
                      <option value="">Select Type (ex. Onboarding)</option>
                      <option value="Onboarding">Onboarding</option>
                      <option value="Conversion">Conversion</option>
                      <option value="Review">Review</option>
                      <option value="Handoff">Handoff</option>
                    </select>
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#525252]">
                      <ChevronDownIcon />
                    </span>
                  </div>
                </Field>
              </div>
              <button
                type="button"
                disabled={!canContinue}
                onClick={onNext}
                className="inline-flex h-[36px] w-full items-center justify-center gap-2 rounded-[6px] border border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7B76DF] to-[#463FBA] text-[13px] font-medium leading-none text-[#FAFAFA] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-opacity disabled:opacity-50"
              >
                Add Steps
                <ArrowRightIcon />
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 px-3 pb-3 pt-2">
              <StepsIcon />
              <h3 className="text-[13px] font-semibold leading-[1.5] text-[#0A0A0A]">
                Add Steps
              </h3>
            </div>
            <div className="flex flex-col gap-1">
              <div className={`flex flex-col rounded-[8px] bg-white p-3 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] ${draft.steps.length > 0 ? "gap-6" : "gap-4"}`}>
                {draft.steps.map((savedStep, index) => (
                  <div key={`${index}-${savedStep}`} className="flex flex-col gap-2">
                    <label className="text-[13px] font-medium leading-none text-[#171717]">Step {index + 1}</label>
                    <div className="rounded-[6px] bg-[#F5F5F5] px-3 py-[10px] text-[12px] font-medium leading-none text-[#171717] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
                      {savedStep}
                    </div>
                    <div className="mt-3 h-px w-full bg-[#E5E5E5]" />
                  </div>
                ))}
                <Field label={draft.steps.length > 0 ? `Step ${draft.steps.length + 1}` : "Step"}>
                  <input
                    value={newStepDraft}
                    onChange={(event) => onNewStepChange(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") onAddStep();
                    }}
                    className={fieldClassName}
                    placeholder={draft.steps.length > 0 ? "Ex. Onboarding → Survey" : "Ex. Landing Page"}
                  />
                </Field>
                <button
                  type="button"
                  onClick={onAddStep}
                  disabled={!newStepDraft.trim()}
                  className="inline-flex h-[30px] w-fit items-center gap-[6px] rounded-[6px] border border-[#525252] bg-gradient-to-b from-[#404040] to-[#0A0A0A] px-3 text-[12px] font-medium leading-none text-[#FAFAFA] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] transition-opacity disabled:opacity-50"
                >
                  <PlusIcon className="h-[15px] w-[15px] shrink-0 text-white" />
                  Add Step
                </button>
              </div>
              <button
                type="button"
                disabled={!canSave}
                onClick={onSave}
                className="inline-flex h-[36px] w-full items-center justify-center gap-2 rounded-[6px] border border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7B76DF] to-[#463FBA] text-[13px] font-medium leading-none text-[#FAFAFA] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-opacity disabled:opacity-50"
              >
                Save & Continue
                <ArrowRightIcon />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const fieldClassName =
  "w-full rounded-[6px] bg-[#F5F5F5] px-3 py-[10px] text-[12px] font-medium leading-none text-[#171717] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] outline-none placeholder:text-[#525252]";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex w-full flex-col gap-2">
      <span className="text-[13px] font-medium leading-none text-[#171717]">{label}</span>
      {children}
    </label>
  );
}

function ScreensPanel({
  screens,
  editingScreenId,
  draftScreenElements,
  onBeginEdit,
  onDraftElementChange,
  onDiscard,
  onSave,
}: {
  screens: ProjectScreen[];
  editingScreenId: string | null;
  draftScreenElements: Record<string, string[]>;
  onBeginEdit: (screen: ProjectScreen) => void;
  onDraftElementChange: (screenId: string, elementIndex: number, value: string) => void;
  onDiscard: (screenId: string) => void;
  onSave: (screenId: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="grid grid-cols-1 gap-1 xl:grid-cols-2">
        {screens.map((screen) => (
          <ScreenCard
            key={screen.id}
            screen={screen}
            editing={editingScreenId === screen.id}
            draftElements={draftScreenElements[screen.id] ?? screen.keyElements}
            onBeginEdit={() => onBeginEdit(screen)}
            onDraftElementChange={(elementIndex, value) => onDraftElementChange(screen.id, elementIndex, value)}
            onDiscard={() => onDiscard(screen.id)}
            onSave={() => onSave(screen.id)}
          />
        ))}
      </div>
    </div>
  );
}

function ScreenCard({
  screen,
  editing,
  draftElements,
  onBeginEdit,
  onDraftElementChange,
  onDiscard,
  onSave,
}: {
  screen: ProjectScreen;
  editing: boolean;
  draftElements: string[];
  onBeginEdit: () => void;
  onDraftElementChange: (elementIndex: number, value: string) => void;
  onDiscard: () => void;
  onSave: () => void;
}) {
  const elements = editing ? draftElements : screen.keyElements;

  return (
    <article className="flex min-h-[331px] flex-col justify-between gap-6 rounded-[8px] bg-white px-4 py-3 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
      <div className="flex flex-col gap-6">
        <div className="flex items-start gap-3">
          <div className="flex h-[27px] w-[27px] shrink-0 items-center justify-center rounded-[4px] bg-[#F5F5F5] p-[6px] text-[#737373]">
            <HomeIcon />
          </div>
          <div className="min-w-0 pt-[1px]">
            <div className="flex flex-wrap items-center gap-1">
              <h3 className="text-[13px] font-medium leading-none text-[#171717]">{screen.title}</h3>
              <span className="inline-flex h-[19px] items-center rounded-[2px] bg-[#F5F5F4] px-[6px] text-[12px] font-normal leading-none text-[#44403C]">
                Appears in {screen.flowCount} flows
              </span>
            </div>
            <p className="mt-2 text-[12px] font-normal leading-none text-[#525252]">
              {screen.description}
            </p>
          </div>
        </div>

        <div className="flex flex-col">
          <div className="pb-0 pl-[10px] pr-3 pt-[6px] text-[12px] font-medium uppercase leading-none text-[#737373]">
            Key Elements
          </div>
          {editing ? (
            <div className="mt-2 flex flex-col gap-4 rounded-[8px] bg-[#FAFAFA] p-2 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
              <ScreenElementList elements={elements} editing onDraftElementChange={onDraftElementChange} />
              <button
                type="button"
                className="inline-flex h-[30px] w-fit items-center gap-2 rounded-[4px] bg-white px-3 text-[12px] font-medium leading-none text-[#7C3AED] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#F5F3FF]"
              >
                <SparkleIcon />
                Regenerate with AI
              </button>
            </div>
          ) : (
            <ScreenElementList elements={elements} />
          )}
        </div>
      </div>

      {editing ? (
        <ScreenEditActions onDiscard={onDiscard} onSave={onSave} />
      ) : (
        <button
          type="button"
          onClick={onBeginEdit}
          className="inline-flex h-[32px] w-fit items-center gap-2 rounded-[6px] border border-[#E5E5E5] bg-[#FAFAFA] px-3 text-[13px] font-medium leading-none text-[#525252] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.15)] transition-colors hover:bg-white"
        >
          <EditIcon />
          Edit Elements
        </button>
      )}
    </article>
  );
}

function ScreenElementList({
  elements,
  editing = false,
  onDraftElementChange,
}: {
  elements: string[];
  editing?: boolean;
  onDraftElementChange?: (elementIndex: number, value: string) => void;
}) {
  return (
    <ul className="m-0 flex list-disc flex-col gap-0 pl-[28px] text-[12px] font-medium leading-none text-[#262626]">
      {elements.map((element, elementIndex) => (
        <li key={`${elementIndex}-${element}`} className="py-[6px] pr-3 marker:text-[#262626]">
          {editing ? (
            <input
              value={element}
              onChange={(event) => onDraftElementChange?.(elementIndex, event.target.value)}
              className="block h-[12px] w-full min-w-0 appearance-none border-0 bg-transparent p-0 text-[12px] font-medium leading-none text-[#262626] outline-none placeholder:text-[#737373] focus:text-[#171717]"
            />
          ) : (
            <span className="leading-none">{element}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

function ScreenEditActions({ onDiscard, onSave }: { onDiscard: () => void; onSave: () => void }) {
  return (
    <div className="flex items-start gap-2">
      <button
        type="button"
        onClick={onDiscard}
        className="inline-flex h-[32px] items-center justify-center rounded-[6px] bg-[#FAFAFA] pl-[10px] pr-3 text-[12px] font-medium leading-none text-[#EF4444] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-colors hover:bg-white"
      >
        Discard Changes
      </button>
      <button
        type="button"
        onClick={onSave}
        className="inline-flex h-[32px] items-center justify-center gap-2 rounded-[6px] border border-[#34D399] bg-gradient-to-b from-[#10B981] to-[#059669] px-3 text-[12px] font-medium leading-none text-[#ECFDF5] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-opacity hover:opacity-90"
      >
        <SaveIcon className="h-4 w-4 shrink-0" />
        Save Changes
      </button>
    </div>
  );
}

function FlowRow({
  flow,
  index,
  expanded,
  editing,
  draftSteps,
  onToggle,
  onBeginEdit,
  onDraftStepChange,
  onDiscard,
  onSave,
}: {
  flow: ProjectFlow;
  index: number;
  expanded: boolean;
  editing: boolean;
  draftSteps: string[];
  onToggle: () => void;
  onBeginEdit: () => void;
  onDraftStepChange: (stepIndex: number, value: string) => void;
  onDiscard: () => void;
  onSave: () => void;
}) {
  return (
    <article className="overflow-hidden rounded-[8px] bg-[#FAFAFA] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
      <div className={`flex justify-between gap-6 rounded-[8px] bg-white p-4 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] ${expanded ? "items-stretch" : "items-start"}`}>
        <div className={`flex min-w-0 items-start gap-3 ${expanded ? "flex-1 flex-col justify-between self-stretch" : ""}`}>
          <div className="flex min-w-0 items-start gap-3">
            <FlowSummary flow={flow} index={index} expanded={expanded} />
          </div>

          {expanded ? (
            <FlowActions editing={editing} onBeginEdit={onBeginEdit} onDiscard={onDiscard} onSave={onSave} />
          ) : null}
        </div>

        {expanded ? (
          <StepsPanel
            steps={editing ? draftSteps : flow.steps ?? []}
            editing={editing}
            onDraftStepChange={onDraftStepChange}
          />
        ) : null}
      </div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="inline-flex h-[36px] items-center gap-[6px] px-4 text-[12px] font-medium leading-none text-[#525252] transition-colors hover:text-[#171717]"
      >
        {expanded ? "See Less" : "See Details"}
        <ChevronDownIcon expanded={expanded} />
      </button>
    </article>
  );
}

function FlowActions({
  editing,
  onBeginEdit,
  onDiscard,
  onSave,
}: {
  editing: boolean;
  onBeginEdit: () => void;
  onDiscard: () => void;
  onSave: () => void;
}) {
  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onDiscard}
          className="inline-flex h-[32px] items-center rounded-[6px] border border-[#E5E5E5] bg-[#FAFAFA] px-3 text-[13px] font-medium leading-none text-[#DC2626] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.15)] transition-colors hover:bg-white"
        >
          Discard Changes
        </button>
        <button
          type="button"
          onClick={onSave}
          className="inline-flex h-[32px] items-center gap-2 rounded-[6px] bg-[#059669] px-3 text-[13px] font-medium leading-none text-white shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#047857]"
        >
          <SaveIcon />
          Save Changes
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onBeginEdit}
      className="inline-flex h-[32px] items-center gap-2 rounded-[6px] border border-[#E5E5E5] bg-[#FAFAFA] px-3 text-[13px] font-medium leading-none text-[#525252] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.15)] transition-colors hover:bg-white"
    >
      <EditIcon />
      Edit Steps
    </button>
  );
}

function FlowSummary({
  flow,
  index,
  expanded,
}: {
  flow: ProjectFlow;
  index: number;
  expanded: boolean;
}) {
  return (
    <>
      <span className="flex h-[22px] min-w-[22px] shrink-0 items-center justify-center rounded-[4px] bg-[#E5E5E5] px-2 py-1 text-[12px] font-medium leading-none text-[#171717]">
        {index}
      </span>
      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-1">
          <h3 className="truncate text-[13px] font-medium leading-none text-[#171717]">
            {flow.title}
          </h3>
          <span className="inline-flex h-[20px] items-center rounded-[2px] bg-[#F0FDF4] px-[6px] text-[12px] font-normal leading-none text-[#022C22]">
            {flow.status}
          </span>
        </div>
        <p className="mt-2 text-[12px] font-normal leading-none text-[#525252]">
          {flow.description}
        </p>

        {expanded ? (
          <div className="mt-3 flex flex-wrap items-center gap-3 text-[12px] font-medium leading-none text-[#737373]">
            {flow.category ? (
              <span className="inline-flex h-[20px] items-center rounded-[2px] bg-[#F3E8FF] px-[6px] text-[#581C87]">
                {flow.category}
              </span>
            ) : null}
            <span className="h-1 w-1 rounded-full bg-[#D4D4D4]" aria-hidden="true" />
            <span className="inline-flex items-center gap-2 py-[6px]">
              <ScreenIcon size={13} />
              {flow.screenCount ?? 0} Screens
            </span>
          </div>
        ) : null}
      </div>
    </>
  );
}

function StepsPanel({
  steps,
  editing,
  onDraftStepChange,
}: {
  steps: string[];
  editing: boolean;
  onDraftStepChange: (stepIndex: number, value: string) => void;
}) {
  return (
    <div className="min-w-[360px] flex-1 rounded-[6px] bg-[#F5F5F5] p-3 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 pr-3 py-[6px] text-[13px] font-medium leading-none text-[#171717]">
          <StepsIcon />
          Steps
        </div>
        <div className="h-px w-full bg-[#E5E5E5]" />
      </div>
      <div className="flex flex-col gap-3 pt-3">
        {steps.map((step, stepIndex) => (
          <div key={`${stepIndex}-${step}`} className="flex items-center gap-3 text-[13px] font-medium leading-none text-[#171717]">
            <span className="flex min-w-[22px] shrink-0 items-center justify-center rounded-[4px] bg-[#E5E5E5] px-2 py-1 text-[12px] font-medium leading-none text-[#171717]">
              {stepIndex + 1}
            </span>
            {editing ? (
              <input
                value={step}
                onChange={(event) => onDraftStepChange(stepIndex, event.target.value)}
                className="block h-[13px] min-w-0 flex-1 appearance-none border-0 bg-transparent p-0 text-[13px] font-medium leading-none text-[#171717] outline-none placeholder:text-[#737373]"
              />
            ) : (
              <span className="min-w-0 truncate">{step}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function PlusIcon({ className = "h-[15px] w-[15px] shrink-0 text-[#737373]" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className={className}>
      <path
        d="M8 2C8.27613 2 8.5 2.22386 8.5 2.5V7.5H13.5C13.7761 7.5 14 7.72387 14 8C14 8.27613 13.7761 8.5 13.5 8.5H8.5V13.5C8.5 13.7761 8.27613 14 8 14C7.72387 14 7.5 13.7761 7.5 13.5V8.5H2.5C2.22386 8.5 2 8.27613 2 8C2 7.72387 2.22386 7.5 2.5 7.5H7.5V2.5C7.5 2.22386 7.72387 2 8 2Z"
        fill="currentColor"
      />
    </svg>
  );
}

function FigmaIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="h-[15px] w-[15px] shrink-0">
      <path d="M5.25 2h2.5v4h-2.5a2 2 0 1 1 0-4Z" fill="#F24E1E" />
      <path d="M7.75 2h2.5a2 2 0 0 1 0 4h-2.5V2Z" fill="#FF7262" />
      <path d="M7.75 6h2.5a2 2 0 1 1 0 4h-2.5V6Z" fill="#1ABCFE" />
      <path d="M5.25 6h2.5v4h-2.5a2 2 0 1 1 0-4Z" fill="#A259FF" />
      <path d="M5.25 10h2.5v2a2 2 0 1 1-2-2Z" fill="#0ACF83" />
    </svg>
  );
}

function FlowIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="h-[15px] w-[15px] shrink-0 text-[#171717]">
      <path
        d="M8 1.66666C9.28867 1.66666 10.3333 2.71133 10.3333 4C10.3333 5.11696 9.54827 6.04967 8.5 6.27864V7.49999H10.6667C11.6792 7.49999 12.5 8.32079 12.5 9.33333V9.72073C13.5484 9.94959 14.3334 10.883 14.3334 12C14.3334 13.2887 13.2887 14.3333 12 14.3333C10.7113 14.3333 9.66669 13.2887 9.66669 12C9.66669 10.883 10.4517 9.94959 11.5 9.72073V9.33333C11.5 8.87306 11.1269 8.49999 10.6667 8.49999H5.33336C4.87312 8.49999 4.50002 8.87306 4.50002 9.33333V9.72073C5.54838 9.94959 6.33336 10.883 6.33336 12C6.33336 13.2887 5.28869 14.3333 4.00002 14.3333C2.71136 14.3333 1.66669 13.2887 1.66669 12C1.66669 10.883 2.45166 9.94959 3.50002 9.72073V9.33333C3.50002 8.32079 4.32084 7.49999 5.33336 7.49999H7.5V6.27864C6.45173 6.04967 5.66669 5.11696 5.66669 4C5.66669 2.71133 6.71136 1.66666 8 1.66666Z"
        fill="currentColor"
      />
    </svg>
  );
}

function StepsIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="h-[15px] w-[15px] shrink-0 text-[#171717]">
      <path
        d="M12.1667 2C13.1792 2 14 2.82081 14 3.83333V4.83333C14 5.84585 13.1792 6.66667 12.1667 6.66667H11.1667C10.1541 6.66667 9.33333 5.84585 9.33333 4.83333H5.87565C5.18628 4.83333 4.95014 5.75167 5.55403 6.08399L10.9277 9.03973C12.4379 9.87033 11.8479 12.1667 10.1243 12.1667H6.66667C6.66667 13.1792 5.84585 14 4.83333 14H3.83333C2.82081 14 2 13.1792 2 12.1667V11.1667C2 10.1541 2.82081 9.33333 3.83333 9.33333H4.83333C5.84585 9.33333 6.66667 10.1541 6.66667 11.1667H10.1243C10.8137 11.1667 11.0499 10.2483 10.4459 9.916L5.07227 6.96027C3.56205 6.12967 4.15209 3.83333 5.87565 3.83333H9.33333C9.33333 2.82081 10.1541 2 11.1667 2H12.1667Z"
        fill="currentColor"
      />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="h-[15px] w-[15px] shrink-0 text-[#737373]">
      <path
        d="M9.16093 0.88891C8.4856 0.336363 7.5144 0.336363 6.83907 0.88891L2.6724 4.298C2.24681 4.6462 2 5.16705 2 5.71692V11.7518C2 12.7642 2.82081 13.5851 3.83333 13.5851H5.33333V9.41851C5.33333 8.40598 6.15415 7.58518 7.16667 7.58518H8.83333C9.84587 7.58518 10.6667 8.40598 10.6667 9.41851V13.5851H12.1667C13.1792 13.5851 14 12.7642 14 11.7518V5.71692C14 5.16705 13.7532 4.6462 13.3276 4.298L9.16093 0.88891Z"
        fill="currentColor"
      />
      <path
        d="M9.66667 13.5V9.33333C9.66667 8.87307 9.2936 8.5 8.83333 8.5H7.16667C6.7064 8.5 6.33333 8.87307 6.33333 9.33333V13.5H9.66667Z"
        fill="currentColor"
      />
    </svg>
  );
}

function ScreenIcon({ size = 15 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className="shrink-0 text-[#737373]"
      style={{ width: size, height: size }}
    >
      <path d="M1.33337 3.83333C1.33337 2.82081 2.15419 2 3.1667 2H12.8334C13.8459 2 14.6667 2.82081 14.6667 3.83333V9.5C14.6667 10.5125 13.8459 11.3333 12.8334 11.3333H3.1667C2.15419 11.3333 1.33337 10.5125 1.33337 9.5V3.83333Z" fill="currentColor" />
      <path d="M4.16278 13.9728C5.36864 13.558 6.65861 13.3333 8.00014 13.3333C9.34168 13.3333 10.6317 13.558 11.8375 13.9728C12.0986 14.0626 12.3831 13.9237 12.4729 13.6627C12.5628 13.4015 12.4239 13.117 12.1628 13.0272C10.8539 12.577 9.45414 12.3333 8.00014 12.3333C6.54614 12.3333 5.14634 12.577 3.83751 13.0272C3.57638 13.117 3.43751 13.4015 3.52734 13.6627C3.61716 13.9237 3.90166 14.0626 4.16278 13.9728Z" fill="currentColor" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="h-[14px] w-[14px] shrink-0 text-[#525252]">
      <path
        d="M9.87867 2L7.43933 4.43934C7.15807 4.72065 7 5.10218 7 5.5V7.49997C7 8.32844 7.6716 8.99997 8.5 8.99997H10.5C10.8978 8.99997 11.2793 8.84197 11.5607 8.56064L14 6.12132V11.387C14 11.743 14 12.0403 13.9802 12.2831C13.9595 12.5364 13.9147 12.7742 13.8002 12.999C13.6244 13.344 13.3439 13.6244 12.999 13.8002C12.7741 13.9148 12.5364 13.9595 12.2831 13.9802C12.0403 14 11.7431 14 11.387 14H4.61303C4.25693 14 3.95971 14 3.71689 13.9802C3.46363 13.9595 3.22586 13.9148 3.00102 13.8002C2.65605 13.6244 2.37559 13.344 2.19982 12.999C2.08526 12.7742 2.04052 12.5364 2.01983 12.2831C1.99999 12.0403 1.99999 11.743 2 11.387V4.61304C1.99999 4.25694 1.99999 3.95971 2.01983 3.71689C2.04052 3.46363 2.08526 3.22586 2.19982 3.00102C2.37559 2.65605 2.65605 2.37559 3.00102 2.19983C3.22586 2.08526 3.46363 2.04052 3.71689 2.01983C3.95971 1.99999 4.25694 1.99999 4.61303 2H9.87867Z"
        fill="currentColor"
      />
      <path
        d="M13.0893 2.79639C12.7638 2.47095 12.2362 2.47095 11.9107 2.79639L9 5.70713V7H10.2929L13.2037 4.08929C13.5291 3.76385 13.5291 3.2362 13.2037 2.91077L13.0893 2.79639ZM11.2037 2.08929C11.9196 1.37332 13.0804 1.37332 13.7963 2.08929L13.9107 2.20367C14.6267 2.91962 14.6267 4.08042 13.9107 4.79639L10.8535 7.8536C10.7598 7.94733 10.6326 8 10.5 8H8.5C8.22387 8 8 7.7762 8 7.5V5.5C8 5.36742 8.05267 5.24024 8.14647 5.14647L11.2037 2.08929Z"
        fill="currentColor"
      />
    </svg>
  );
}

function SaveIcon({ className = "h-[14px] w-[14px] shrink-0" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className={className}>
      <path d="M4.66667 2H3.83333C2.82081 2 2 2.82081 2 3.83333V12.1667C2 13.1792 2.82081 14 3.83333 14H4.66667V8.5C4.66667 8.22387 4.89053 8 5.16667 8H10.8333C11.1095 8 11.3333 8.22387 11.3333 8.5V14H12.1667C13.1792 14 14 13.1792 14 12.1667V5.05229C14 4.56605 13.8069 4.09974 13.463 3.75592L12.2441 2.53697C11.9927 2.28553 11.6757 2.11467 11.3333 2.04101V5.5C11.3333 5.77614 11.1095 6 10.8333 6H5.16667C4.89053 6 4.66667 5.77614 4.66667 5.5V2Z" fill="currentColor" />
      <path d="M10.3333 2H5.66663V5H10.3333V2Z" fill="currentColor" />
      <path d="M10.3333 14V9H5.66663V14H10.3333Z" fill="currentColor" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="h-3 w-3 shrink-0">
      <path
        d="M9.83333 0.666667C9.83333 0.390527 9.60947 0.166667 9.33333 0.166667C9.0572 0.166667 8.83333 0.390527 8.83333 0.666667C8.83333 2.28387 8.47607 3.3342 7.8218 3.98847C7.16753 4.64274 6.1172 5 4.5 5C4.22386 5 4 5.22387 4 5.5C4 5.77614 4.22386 6 4.5 6C6.1172 6 7.16753 6.35727 7.8218 7.01154C8.47607 7.6658 8.83333 8.71614 8.83333 10.3333C8.83333 10.6095 9.0572 10.8333 9.33333 10.8333C9.60947 10.8333 9.83333 10.6095 9.83333 10.3333C9.83333 8.71614 10.1906 7.6658 10.8449 7.01154C11.4991 6.35727 12.5495 6 14.1667 6C14.4428 6 14.6667 5.77614 14.6667 5.5C14.6667 5.22387 14.4428 5 14.1667 5C12.5495 5 11.4991 4.64274 10.8449 3.98847C10.1906 3.3342 9.83333 2.28387 9.83333 0.666667Z"
        fill="currentColor"
      />
      <path
        d="M4.16667 8.5C4.16667 8.22386 3.94281 8 3.66667 8C3.39053 8 3.16667 8.22386 3.16667 8.5C3.16667 9.5385 2.93673 10.1721 2.55443 10.5544C2.17214 10.9367 1.5385 11.1667 0.5 11.1667C0.22386 11.1667 0 11.3905 0 11.6667C0 11.9428 0.22386 12.1667 0.5 12.1667C1.5385 12.1667 2.17214 12.3966 2.55443 12.7789C2.93673 13.1612 3.16667 13.7948 3.16667 14.8333C3.16667 15.1095 3.39053 15.3333 3.66667 15.3333C3.94281 15.3333 4.16667 15.1095 4.16667 14.8333C4.16667 13.7948 4.39661 13.1612 4.7789 12.7789C5.16119 12.3966 5.79483 12.1667 6.83333 12.1667C7.10947 12.1667 7.33333 11.9428 7.33333 11.6667C7.33333 11.3905 7.10947 11.1667 6.83333 11.1667C5.79483 11.1667 5.16119 10.9367 4.7789 10.5544C4.39661 10.1721 4.16667 9.5385 4.16667 8.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="h-4 w-4 shrink-0">
      <path d="M3.5 8h9M9 4.5 12.5 8 9 11.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronDownIcon({ expanded = false }: { expanded?: boolean }) {
  return (
    <svg viewBox="0 0 12 12" fill="none" aria-hidden="true" className="h-3 w-3 shrink-0 text-[#525252]">
      <path
        d={expanded ? "M1.08337 7.08333L5.25004 2.91666L9.41671 7.08333" : "M1.08337 2.91666L5.25004 7.08333L9.41671 2.91666"}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
