import { Plus } from "@phosphor-icons/react";
import { useState } from "react";
import {
  FigmaOnboardingFrame,
  FigmaSection,
  FigmaStepHeader,
} from "@/components/onboarding/OnboardingFigmaPrimitives";
import { cn } from "@/lib/utils";
import type { UseProjectDraftResult } from "@/features/project-creation/useProjectDraft";
import type { OnboardingStepId } from "@/features/onboarding/model";
import { ONBOARDING_ICON_SRC } from "../constants";
import { OnboardingStepMotion } from "../OnboardingPrimitives";

type OnboardingMethodStepProps = {
  step: OnboardingStepId;
  draftState: UseProjectDraftResult;
};

export function OnboardingMethodStep({ step, draftState }: OnboardingMethodStepProps) {
  const { draft } = draftState;
  const [isAddingPhase, setIsAddingPhase] = useState(false);
  const [newPhaseName, setNewPhaseName] = useState("");

  const activePhases = draft.phases.filter((phase) => phase.on);
  const roadmapItems = activePhases;

  function submitNewPhase() {
    const phaseName = newPhaseName.trim();
    if (!phaseName) {
      return;
    }

    draftState.addPhase(phaseName);
    setNewPhaseName("");
    setIsAddingPhase(false);
  }

  return (
    <OnboardingStepMotion motionKey="method">
      <FigmaOnboardingFrame>
        <FigmaStepHeader step={step} />
        <div className="mt-6">
          <FigmaSection label="How do you want to structure this project?">
            <div className="space-y-1">
              <div className="rounded-[8px] bg-white p-3 shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
                <button
                  type="button"
                  onClick={() => draftState.setMethod("ai")}
                  className="flex w-full cursor-pointer items-center gap-2 rounded-[6px] bg-transparent px-1 py-2 text-left focus:outline-none"
                >
                  <span
                    className={cn(
                      "grid h-[14px] w-[14px] shrink-0 place-items-center rounded-full",
                      draft.method === "ai" ? "bg-[#171717]" : "bg-[#E5E5E5]",
                    )}
                  >
                    {draft.method === "ai" ? (
                      <span className="h-[6px] w-[6px] rounded-full bg-white" />
                    ) : null}
                  </span>
                  <span className="text-[13px] font-medium text-[#171717]">Smart Setup</span>
                </button>
                <button
                  type="button"
                  onClick={() => draftState.setMethod("manual")}
                  className="flex w-full cursor-pointer items-center gap-2 rounded-[6px] bg-transparent px-1 py-2 text-left focus:outline-none"
                >
                  <span
                    className={cn(
                      "grid h-[14px] w-[14px] shrink-0 place-items-center rounded-full",
                      draft.method === "manual" ? "bg-[#171717]" : "bg-[#E5E5E5]",
                    )}
                  >
                    {draft.method === "manual" ? (
                      <span className="h-[6px] w-[6px] rounded-full bg-white" />
                    ) : null}
                  </span>
                  <span className="text-[13px] font-medium text-[#171717]">Manual Setup</span>
                </button>
              </div>

              {draft.method === "manual" ? (
                <div className="rounded-[8px] bg-white p-3 shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
                  <p className="mb-2 text-[13px] font-medium text-text-primary">Select Phases</p>
                  <div>
                    {draft.phases.map((phase, index) => (
                      <div
                        key={phase.id}
                        draggable
                        onDragStart={(event) => draftState.handleDragStart(event, phase.id)}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={(event) => draftState.handleDrop(event, phase.id)}
                        onDragEnd={draftState.handleDragEnd}
                        className={cn(
                          "flex min-h-[42px] items-center gap-3 py-2.5",
                          index < draft.phases.length - 1 ? "border-b border-[#EFEFF2]" : "",
                        )}
                      >
                        <img
                          src={ONBOARDING_ICON_SRC.dots}
                          alt=""
                          className="h-4 w-4 shrink-0 cursor-grab opacity-45"
                        />
                        <span
                          className={cn(
                            "flex-1 text-left text-[13px] font-medium",
                            phase.on ? "text-text-primary" : "text-text-tertiary",
                          )}
                        >
                          {phase.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => draftState.togglePhase(phase.id)}
                          className={cn(
                            "relative h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors focus:outline-none",
                            phase.on ? "bg-[#DEDDFD]" : "bg-[#E5E5E5]",
                          )}
                          aria-label={`Toggle ${phase.name}`}
                        >
                          <span
                            className={cn(
                              "absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full transition-all",
                              phase.on ? "left-[18px] bg-[#525252]" : "left-0.5 bg-[#BFBFBF]",
                            )}
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                  {isAddingPhase ? (
                    <div className="mt-4 flex h-9 w-full items-center rounded-[6px] bg-[#F5F5F5] py-1 pl-3 pr-1 shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
                      <input
                        type="text"
                        value={newPhaseName}
                        onChange={(event) => setNewPhaseName(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            submitNewPhase();
                          }
                          if (event.key === "Escape") {
                            setNewPhaseName("");
                            setIsAddingPhase(false);
                          }
                        }}
                        placeholder="Testing"
                        autoFocus
                        className="min-w-0 flex-1 bg-transparent text-[12px] font-medium text-[#262626] outline-none placeholder:text-[#737373]"
                      />
                      <button
                        type="button"
                        onClick={submitNewPhase}
                        disabled={!newPhaseName.trim()}
                        className="inline-flex h-7 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-[4px] border border-[#525252] bg-gradient-to-b from-[#404040] to-[#0A0A0A] pl-2.5 pr-3 text-[12px] font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] transition-opacity disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        <Plus size={14} weight="bold" />
                        <span>Add</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setNewPhaseName("");
                        setIsAddingPhase(true);
                      }}
                      className="mt-4 flex h-9 w-full cursor-pointer items-center justify-center gap-1.5 rounded-[6px] bg-[#F5F5F5] px-3 text-[12px] font-medium text-[#0A0A0A] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#EFEFEF] focus:outline-none"
                    >
                      <Plus size={14} weight="bold" />
                      <span>Add Phase</span>
                    </button>
                  )}
                </div>
              ) : draft.method === "ai" && roadmapItems.length > 0 ? (
                <div className="rounded-[8px] bg-white p-4 shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
                  <div className="relative py-0.5 pl-1">
                    <span
                      aria-hidden
                      className="absolute bottom-[7px] left-[11px] top-[7px] w-px rounded-full bg-[#A3A3A3]"
                    />
                    <ul className="space-y-3.5">
                      {roadmapItems.map((phase) => (
                        <li key={phase.id} className="relative flex items-center gap-3">
                          <span className="relative z-10 grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full bg-[#2F2A7D]">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#FAFAFA]" />
                          </span>
                          <span className="text-[13px] font-medium text-text-primary">
                            {phase.name}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : null}
            </div>
          </FigmaSection>
        </div>
      </FigmaOnboardingFrame>
    </OnboardingStepMotion>
  );
}
