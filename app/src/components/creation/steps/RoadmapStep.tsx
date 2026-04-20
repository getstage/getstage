import { BackButton, PrimaryButton } from "@/components/creation/CreationChrome";
import type { WorkflowStep } from "@/hooks/useProjectCreation";
import type { RoadmapTemplateItem } from "@/lib/constants";

type RoadmapStepProps = {
  roadmap: RoadmapTemplateItem[];
  canContinue: boolean;
  isCreating: boolean;
  currentIndex: number;
  steps: WorkflowStep[];
  onContinue: () => void;
  onBack: () => void;
};

export function RoadmapStep({
  roadmap,
  canContinue,
  isCreating,
  currentIndex: _currentIndex,
  steps: _steps,
  onContinue,
  onBack,
}: RoadmapStepProps) {
  return (
    <div>
      <h2 className="mb-2 text-center font-heading text-[24px] font-semibold tracking-[-0.4px] text-text-primary">
        Your roadmap
      </h2>
      <p className="mb-8 text-center text-[15px] leading-[1.5] text-text-secondary">
        Looking good. You can adjust everything later.
      </p>

      <div className="mb-7">
        {roadmap.map((phase, index) => (
          <div key={`${phase.name}-${index}`} className="flex items-center gap-3.5">
            <div className="flex w-[18px] flex-shrink-0 flex-col items-center">
              <span className="h-2.5 w-2.5 rounded-full bg-accent" />
              {index < roadmap.length - 1 ? <span className="h-7 w-px bg-border" /> : null}
            </div>
            <div className="flex flex-1 items-center justify-between py-2">
              <span className="text-[14px] font-medium text-text-primary">{phase.name}</span>
              <span className="text-[13px] text-text-secondary">
                {phase.tasks.length} {phase.tasks.length === 1 ? "task" : "tasks"}
              </span>
            </div>
          </div>
        ))}
      </div>

      <PrimaryButton
        label={isCreating ? "Creating..." : "Create Project"}
        disabled={!canContinue}
        onClick={onContinue}
      />
      <BackButton onClick={onBack} />
    </div>
  );
}
