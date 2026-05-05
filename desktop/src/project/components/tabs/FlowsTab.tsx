import { useState } from "react";
import type { Project, ProjectFlow } from "../../models/project";

export function FlowsTab({ project }: { project: Project }) {
  const [flows, setFlows] = useState<ProjectFlow[]>(project.flows);
  const [expandedFlowId, setExpandedFlowId] = useState<string | null>(project.flows[0]?.id ?? null);
  const [editingFlowId, setEditingFlowId] = useState<string | null>(null);
  const [draftSteps, setDraftSteps] = useState<Record<string, string[]>>({});

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

  return (
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

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
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
        </div>

        <div className="flex items-start gap-2">
          <button
            type="button"
            className="inline-flex h-[32px] items-center gap-2 rounded-[6px] bg-white px-3 text-[13px] font-medium leading-none text-[#171717] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]"
          >
            <FlowIcon />
            Flows
            <span className="text-[#737373]">({flowTotal})</span>
          </button>
          <button
            type="button"
            className="inline-flex h-[32px] items-center gap-2 rounded-[6px] px-3 text-[13px] font-medium leading-none text-[#737373] transition-colors hover:bg-white"
          >
            <ScreenIcon />
            Screens
            <span>({screenTotal})</span>
          </button>
        </div>

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
      </div>
    </section>
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
      <div className="flex items-start justify-between gap-6 rounded-[8px] bg-white p-4 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
        <div className={`flex min-w-0 items-start gap-3 ${expanded ? "min-h-[238px] flex-1 flex-col justify-between" : ""}`}>
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
      <div className="flex h-[27px] items-center gap-2 border-b border-[#E5E5E5] pb-3 pr-3 text-[13px] font-medium leading-none text-[#171717]">
        <FlowIcon />
        Steps
      </div>
      <div className="flex flex-col gap-3 pt-3">
        {steps.map((step, stepIndex) => (
          <div key={`${stepIndex}-${step}`} className="flex items-center gap-3 text-[13px] font-medium leading-none text-[#171717]">
            <span className="flex h-[22px] min-w-[22px] items-center justify-center rounded-[4px] bg-[#E5E5E5] text-[12px]">
              {stepIndex + 1}
            </span>
            {editing ? (
              <input
                value={step}
                onChange={(event) => onDraftStepChange(stepIndex, event.target.value)}
                className="h-[28px] min-w-0 flex-1 rounded-[4px] border border-[#D4D4D4] bg-white px-2 text-[13px] font-medium leading-none text-[#171717] outline-none transition-colors focus:border-[#8D87FF]"
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

function PlusIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="h-[15px] w-[15px] shrink-0 text-[#737373]">
      <path d="M8 3.5v9M3.5 8h9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
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
      <path d="M4 3v4c0 1.1.9 2 2 2h4c1.1 0 2 .9 2 2v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="4" cy="3" r="1.5" fill="currentColor" />
      <circle cx="12" cy="13" r="1.5" fill="currentColor" />
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
      <rect x="3" y="4" width="10" height="7" rx="1" fill="currentColor" opacity="0.85" />
      <path d="M6.5 13h3M8 11v2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="h-[14px] w-[14px] shrink-0 text-[#525252]">
      <path d="M9.9 3.1 12.9 6.1M3.5 10.5l-.5 2.5 2.5-.5 7-7a1.4 1.4 0 0 0-2-2l-7 7Z" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8.8 4.2 11.8 7.2" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
    </svg>
  );
}

function SaveIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="h-[14px] w-[14px] shrink-0">
      <path d="M4 2.5h6.2L12.5 4.8V13.5h-9v-11Z" stroke="currentColor" strokeWidth="1.35" strokeLinejoin="round" />
      <path d="M5.5 2.5v4h4.5v-4M5.75 13.5v-4h4.5v4" stroke="currentColor" strokeWidth="1.35" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronDownIcon({ expanded = false }: { expanded?: boolean }) {
  return (
    <svg viewBox="0 0 12 12" fill="none" aria-hidden="true" className="h-3 w-3 shrink-0 text-[#525252]">
      <path d={expanded ? "M3 7.5 6 4.5l3 3" : "M3 4.5 6 7.5l3-3"} stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
