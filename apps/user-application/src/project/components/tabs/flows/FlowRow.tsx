import type { ProjectFlow } from "../../../models/project";
import { FlowActions } from "./FlowActions";
import { FlowSummary } from "./FlowSummary";
import { ChevronDownIcon } from "./flowsIcons";
import { StepsPanel } from "./StepsPanel";

export function FlowRow({
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
        className="inline-flex h-[36px] items-center gap-[6px] px-4 text-[12px] font-medium leading-[1.25] text-[#525252] transition-colors hover:text-[#171717]"
      >
        {expanded ? "See Less" : "See Details"}
        <ChevronDownIcon expanded={expanded} />
      </button>
    </article>
  );
}
