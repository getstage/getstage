import type { ReactNode } from "react";
import type { AddFlowDraft, AddFlowStep } from "@/types/project/flowsTab";
import { ArrowRightIcon, ChevronDownIcon, PlusIcon, StepsIcon } from "./flowsIcons";

const fieldClassName =
  "w-full rounded-[6px] bg-[#F5F5F5] px-3 py-[10px] text-[12px] font-medium leading-[1.25] text-[#171717] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] outline-none placeholder:text-[#525252]";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex w-full flex-col gap-2">
      <span className="text-[13px] font-medium leading-[1.25] text-[#171717]">{label}</span>
      {children}
    </label>
  );
}

export function AddFlowModal({
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
  draft: AddFlowDraft;
  newStepDraft: string;
  onClose: () => void;
  onDraftChange: (patch: Partial<AddFlowDraft>) => void;
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
                className="inline-flex h-[36px] w-full items-center justify-center gap-2 rounded-[6px] border border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7B76DF] to-[#463FBA] text-[13px] font-medium leading-[1.25] text-[#FAFAFA] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-opacity disabled:opacity-50"
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
                    <label className="text-[13px] font-medium leading-[1.25] text-[#171717]">Step {index + 1}</label>
                    <div className="rounded-[6px] bg-[#F5F5F5] px-3 py-[10px] text-[12px] font-medium leading-[1.25] text-[#171717] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
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
                  className="inline-flex h-[30px] w-fit items-center gap-[6px] rounded-[6px] border border-[#525252] bg-gradient-to-b from-[#404040] to-[#0A0A0A] px-3 text-[12px] font-medium leading-[1.25] text-[#FAFAFA] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] transition-opacity disabled:opacity-50"
                >
                  <PlusIcon className="h-[15px] w-[15px] shrink-0 text-white" />
                  Add Step
                </button>
              </div>
              <button
                type="button"
                disabled={!canSave}
                onClick={onSave}
                className="inline-flex h-[36px] w-full items-center justify-center gap-2 rounded-[6px] border border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7B76DF] to-[#463FBA] text-[13px] font-medium leading-[1.25] text-[#FAFAFA] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-opacity disabled:opacity-50"
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
