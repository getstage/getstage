import type { RoadmapMode } from "@/models/project/createProject";
import { SMART_ROADMAP_PHASES } from "@/models/project/createProject";
import {
  CreateProjectButton,
  CreateProjectStepShell,
  DragHandleIcon,
  PlusIcon,
  RadioOption,
  ToggleSwitch,
} from "./CreateProjectPrimitives";
import { cn } from "@/lib/utils";

export function RoadmapStep({
  mode,
  manualPhases,
  enabledPhases,
  addingPhase,
  newPhaseName,
  onModeChange,
  onPhaseToggle,
  onAddPhaseStart,
  onNewPhaseNameChange,
  onAddPhase,
  onCreateProject,
  onStepSelect,
  isCreating,
  error,
}: {
  mode: RoadmapMode;
  manualPhases: string[];
  enabledPhases: Set<string>;
  addingPhase: boolean;
  newPhaseName: string;
  onModeChange: (mode: RoadmapMode) => void;
  onPhaseToggle: (phase: string) => void;
  onAddPhaseStart: () => void;
  onNewPhaseNameChange: (name: string) => void;
  onAddPhase: () => void;
  onCreateProject: () => void;
  onStepSelect: (stepIndex: number) => void;
  isCreating: boolean;
  error: string | null;
}) {
  const selectedPhaseCount =
    mode === "smart"
      ? SMART_ROADMAP_PHASES.length
      : manualPhases.filter((phase) => enabledPhases.has(phase)).length;
  const canCreate = selectedPhaseCount >= 2 && !isCreating;

  return (
    <CreateProjectStepShell
      title="Build your roadmap"
      description="How do you want to structure this project?"
      activeStepIndex={5}
      headerGapClassName="gap-[24px]"
      descriptionClassName="w-full"
      onStepSelect={onStepSelect}
    >
      <form
        className="flex w-full flex-col items-start gap-[12px]"
        onSubmit={(event) => {
          event.preventDefault();
          onCreateProject();
        }}
      >
        <div className="flex w-full flex-col items-start rounded-[12px] bg-[#f5f5f5] p-[4px] shadow-[0px_0.45px_0.5px_0px_rgba(10,10,10,0.25)]">
          <div className="flex items-center justify-center px-[12px] pb-[12px] pt-[8px]">
            <p className="whitespace-nowrap text-[13px] font-semibold leading-[1.5] text-[#0a0a0a]">
              How do you want to structure this project?
            </p>
          </div>

          <div className="flex w-full flex-col items-start gap-[4px]">
            <div className="flex w-full flex-col items-start rounded-[8px] bg-white p-[12px] shadow-[0px_0.45px_0.5px_0px_rgba(10,10,10,0.25)]">
              <div className="flex w-full flex-col items-start justify-center gap-[16px]">
                <RadioOption
                  selected={mode === "smart"}
                  label="Smart Setup"
                  onSelect={() => onModeChange("smart")}
                />
                <RadioOption
                  selected={mode === "manual"}
                  label="Manual Setup"
                  onSelect={() => onModeChange("manual")}
                />
              </div>
            </div>

            {mode === "smart" ? (
              <SmartRoadmapPreview phases={SMART_ROADMAP_PHASES} />
            ) : (
              <ManualRoadmapEditor
                phases={manualPhases}
                enabledPhases={enabledPhases}
                addingPhase={addingPhase}
                newPhaseName={newPhaseName}
                onPhaseToggle={onPhaseToggle}
                onAddPhaseStart={onAddPhaseStart}
                onNewPhaseNameChange={onNewPhaseNameChange}
                onAddPhase={onAddPhase}
              />
            )}
          </div>
        </div>

        {error ? <p className="text-[12px] font-medium text-[#b91c1c]">{error}</p> : null}
        <CreateProjectButton isCreating={isCreating} disabled={!canCreate} />
      </form>
    </CreateProjectStepShell>
  );
}

function SmartRoadmapPreview({ phases }: { phases: string[] }) {
  return (
    <div className="flex w-full flex-col items-start rounded-[8px] bg-white p-[12px] shadow-[0px_0.45px_0.5px_0px_rgba(10,10,10,0.25)]">
      <div className="flex w-full flex-col items-start justify-center">
        {phases.map((phase, index) => (
          <div
            key={phase}
            className={cn(
              "relative grid grid-cols-[15px_auto] items-start gap-[8px]",
              index < phases.length - 1 ? "h-[42px]" : "h-[20px]",
            )}
          >
            <div className="mt-[3px] flex h-[14px] w-[15px] shrink-0 items-center justify-center">
                <span className="flex h-[14px] w-[14px] items-center justify-center rounded-full bg-[#2f2a7d]">
                  <span className="h-[6px] w-[6px] rounded-full bg-[#fafafa]" />
                </span>
            </div>
            {index < phases.length - 1 ? (
              <div className="absolute left-[7px] top-[17px] h-[28px] w-px bg-[#2f2a7d]" />
            ) : null}
            <p className="whitespace-nowrap text-[13px] font-medium leading-[20px] text-[#0a0a0a]">
              {phase}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ManualRoadmapEditor({
  phases,
  enabledPhases,
  addingPhase,
  newPhaseName,
  onPhaseToggle,
  onAddPhaseStart,
  onNewPhaseNameChange,
  onAddPhase,
}: {
  phases: string[];
  enabledPhases: Set<string>;
  addingPhase: boolean;
  newPhaseName: string;
  onPhaseToggle: (phase: string) => void;
  onAddPhaseStart: () => void;
  onNewPhaseNameChange: (name: string) => void;
  onAddPhase: () => void;
}) {
  return (
    <div className="flex w-full flex-col items-start rounded-[8px] bg-white p-[12px] shadow-[0px_0.45px_0.5px_0px_rgba(10,10,10,0.25)]">
      <div className="flex w-full flex-col items-start justify-center">
        <div className="flex w-full flex-col items-start gap-[8px]">
          <p className="whitespace-nowrap text-[13px] font-medium leading-[1.25] text-[#171717]">
            Select Phases
          </p>

          <div className="flex w-full flex-col items-start gap-[16px]">
            <div className="flex w-full flex-col items-start gap-[4px]">
              {phases.map((phase) => (
                <div
                  key={phase}
                  className="flex w-full items-center justify-between overflow-hidden border-b border-[#f5f5f5] pb-[16px] pt-[10px]"
                >
                  <div className="flex items-center gap-[6px]">
                    <DragHandleIcon />
                    <p className="whitespace-nowrap text-[12px] font-medium leading-[1.25] text-[#0a0a0a]">
                      {phase}
                    </p>
                  </div>
                  <ToggleSwitch
                    checked={enabledPhases.has(phase)}
                    onToggle={() => onPhaseToggle(phase)}
                  />
                </div>
              ))}
            </div>

            {addingPhase ? (
              <div className="flex w-full items-center justify-between overflow-hidden rounded-[6px] bg-[#f5f5f5] py-[4px] pl-[12px] pr-[4px] shadow-[0px_0.45px_1px_0px_rgba(10,10,10,0.25)]">
                <input
                  value={newPhaseName}
                  onChange={(event) => onNewPhaseNameChange(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      onAddPhase();
                    }
                  }}
                  autoFocus
                  placeholder="Testing"
                  aria-label="New phase name"
                  className="min-w-0 flex-1 bg-transparent text-[12px] font-medium leading-[1.25] text-[#262626] outline-none placeholder:text-[#525252]"
                />
                <button
                  type="button"
                  onClick={onAddPhase}
                  className="flex shrink-0 cursor-pointer items-center gap-[6px] rounded-[6px] border border-[#525252] bg-gradient-to-b from-[#404040] to-[#0a0a0a] py-[8px] pl-[10px] pr-[12px] text-[12px] font-medium leading-[1.25] text-[#fafafa] shadow-[0px_0.45px_1px_0px_rgba(10,10,10,0.25)]"
                >
                  <PlusIcon />
                  <span>Add</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onAddPhaseStart}
                className="flex w-full cursor-pointer items-center justify-center gap-[6px] overflow-hidden rounded-[6px] bg-[#f5f5f5] px-[12px] py-[10px] text-[12px] font-medium leading-[1.25] text-[#0a0a0a] shadow-[0px_0.45px_1px_0px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#eeeeee]"
              >
                <PlusIcon />
                <span>Add Phase</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
