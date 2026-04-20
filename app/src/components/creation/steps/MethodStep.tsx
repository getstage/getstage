import { BackButton, PrimaryButton } from "@/components/creation/CreationChrome";
import { cn } from "@/lib/utils";
import type { Method, WorkflowStep } from "@/hooks/useProjectCreation";

type MethodStepProps = {
  method: Method;
  canContinue: boolean;
  currentIndex: number;
  steps: WorkflowStep[];
  onMethodChange: (value: Exclude<Method, null>) => void;
  onContinue: () => void;
  onBack: () => void;
};

export function MethodStep({
  method,
  canContinue,
  currentIndex: _currentIndex,
  steps: _steps,
  onMethodChange,
  onContinue,
  onBack,
}: MethodStepProps) {
  return (
    <div>
      <h2 className="mb-2 text-center font-heading text-[24px] font-semibold tracking-[-0.4px] text-text-primary">
        Build your roadmap
      </h2>
      <p className="mb-8 text-center text-[15px] leading-[1.5] text-text-secondary">
        How do you want to structure this project?
      </p>

      <div className="mb-7 flex flex-col gap-2.5">
        <MethodOption
          selected={method === "ai"}
          title="AI-Generated"
          description="Tailored phases and tasks based on your project type."
          onClick={() => onMethodChange("ai")}
        />
        <MethodOption
          selected={method === "manual"}
          title="Manual Setup"
          description="Choose your own phases and add tasks as you go."
          onClick={() => onMethodChange("manual")}
        />
      </div>

      <PrimaryButton label="Continue" disabled={!canContinue} onClick={onContinue} />
      <BackButton onClick={onBack} />
    </div>
  );
}

type MethodOptionProps = {
  selected: boolean;
  title: string;
  description: string;
  onClick: () => void;
};

function MethodOption({ selected, title, description, onClick }: MethodOptionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "cursor-pointer rounded-xl border-[1.5px] bg-input-bg px-5 py-[18px] text-left transition-all duration-200",
        selected
          ? "border-accent bg-[rgba(135,130,245,0.08)]"
          : "border-transparent hover:bg-[#EFEFEF]",
      )}
    >
      <div className={cn("mb-1 text-[15px] font-medium", selected ? "text-accent" : "text-text-primary")}>
        {title}
      </div>
      <div className="text-[13px] leading-[1.4] text-text-secondary">{description}</div>
    </button>
  );
}
