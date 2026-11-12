import type { ProjectFlow } from "./model";
import { FlowActions } from "./FlowActions";
import { FlowSummary } from "./FlowSummary";
import { ChevronDownIcon } from "./flowsIcons";
import { StepsPanel } from "./StepsPanel";

// Editing a flow (steps, status, regenerate) happens in Stage for Mac; without `edit` (the web app) the row is read-only.
export type FlowRowEdit = {
  editing: boolean;
  regenerating: boolean;
  draftSteps: string[];
  onBeginEdit: () => void;
  onRegenerate: () => void;
  onDraftStepChange: (stepIndex: number, value: string) => void;
  onStatusChange: (status: "Draft" | "In Review" | "Approved") => void;
  onDiscard: () => void;
  onSave: () => void;
};

export function FlowRow({ flow, index, expanded, onToggle, edit }: {
  flow: ProjectFlow;
  index: number;
  expanded: boolean;
  onToggle: () => void;
  edit?: FlowRowEdit;
}) {
  const editing = edit?.editing === true;
  return (
    <article className="overflow-hidden rounded-[8px] bg-[#FAFAFA] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
      <div className={`flex flex-wrap justify-between gap-6 rounded-[8px] bg-white p-4 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] ${expanded ? "items-stretch" : "items-start"}`}>
        <div className={`flex min-w-0 items-start gap-3 ${expanded ? "flex-1 basis-[280px] flex-col justify-between self-stretch" : ""}`}>
          <div className="flex min-w-0 items-start gap-3">
            <FlowSummary
              flow={flow}
              index={index}
              expanded={expanded}
              onStatusChange={edit?.onStatusChange}
            />
          </div>

          {expanded && edit ? (
            <FlowActions
              editing={editing}
              regenerating={edit.regenerating}
              onBeginEdit={edit.onBeginEdit}
              onRegenerate={edit.onRegenerate}
              onDiscard={edit.onDiscard}
              onSave={edit.onSave}
            />
          ) : null}
        </div>

        {expanded ? (
          <StepsPanel
            steps={edit && editing ? edit.draftSteps : flow.steps ?? []}
            editing={editing}
            onDraftStepChange={edit?.onDraftStepChange}
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
