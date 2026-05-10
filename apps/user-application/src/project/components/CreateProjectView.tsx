import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode, RefObject } from "react";
import { useNavigate } from "@tanstack/react-router";
import stageLogoLight from "@/assets/logos/stage-logo-light.png";
import { cn } from "@/lib/utils";

const progressSteps = [0, 1, 2, 3, 4];
const projectTypeOptions = [
  { id: "web-design", label: "Web Design", iconSrc: "/logos/dashboard/web-design.svg" },
  { id: "app-design", label: "App Design", iconSrc: "/logos/dashboard/app-design.svg" },
  { id: "web-app", label: "Web App", iconSrc: "/logos/dashboard/web-app.svg" },
] as const;
const smartRoadmapPhases = ["Research", "Architecture", "Design", "Development", "Testing"];
const defaultManualPhases = ["Discovery", "Strategy", "Design", "Development", "Launch"];

type CreateProjectStep = "basic" | "client" | "type" | "timeline" | "roadmap" | "success";
type ProjectTypeId = (typeof projectTypeOptions)[number]["id"];
type RoadmapMode = "smart" | "manual";

export function CreateProjectView() {
  const navigate = useNavigate();
  const projectImageInputRef = useRef<HTMLInputElement>(null);
  const clientPhotoInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<CreateProjectStep>("basic");
  const [projectName, setProjectName] = useState("");
  const [projectImage, setProjectImage] = useState<File | null>(null);
  const [clientMode, setClientMode] = useState("new");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhoto, setClientPhoto] = useState<File | null>(null);
  const [projectType, setProjectType] = useState<ProjectTypeId | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [roadmapMode, setRoadmapMode] = useState<RoadmapMode>("smart");
  const [manualPhases, setManualPhases] = useState(defaultManualPhases);
  const [enabledPhases, setEnabledPhases] = useState<Set<string>>(
    () => new Set(defaultManualPhases),
  );
  const [addingPhase, setAddingPhase] = useState(false);
  const [newPhaseName, setNewPhaseName] = useState("");

  const clientPhotoUrl = useMemo(() => {
    if (!clientPhoto) return "";
    return URL.createObjectURL(clientPhoto);
  }, [clientPhoto]);

  useEffect(() => {
    return () => {
      if (clientPhotoUrl) URL.revokeObjectURL(clientPhotoUrl);
    };
  }, [clientPhotoUrl]);

  if (step === "success") {
    return (
      <ProjectCreatedStep
        onViewProject={() =>
          void navigate({
            to: "/project/$projectId",
            params: { projectId: "baseframe" },
          })
        }
      />
    );
  }

  return (
    <main className="flex h-screen items-start overflow-hidden bg-white p-[8px]">
      <section className="flex h-full flex-1 flex-col items-center overflow-y-auto rounded-[12px] bg-white shadow-[0px_0.45px_0.5px_0px_rgba(10,10,10,0.25)]">
        <div className="flex min-h-full w-full max-w-[460px] flex-col items-start justify-between py-[100px]">
          <div className="flex w-full shrink-0 items-start">
            <button
              type="button"
              onClick={() => void navigate({ to: "/" })}
              className="flex cursor-pointer items-center gap-[8px] text-[13px] font-medium leading-[1.5] text-[#a3a3a3] transition-colors hover:text-[#525252]"
            >
              <ArrowLeftIcon />
              <span>Back to dashboard</span>
            </button>
          </div>

          <div className="flex w-full shrink-0 flex-col items-start gap-[32px] py-[44px]">
            <img
              src={stageLogoLight}
              alt="Stage"
              className="h-[23px] w-auto object-contain"
            />

            {step === "basic" ? (
              <BasicDetailsStep
                projectName={projectName}
                projectImage={projectImage}
                onProjectNameChange={setProjectName}
                onProjectImageChange={setProjectImage}
                onPickProjectImage={() => projectImageInputRef.current?.click()}
                onContinue={() => setStep("client")}
                inputRef={projectImageInputRef}
              />
            ) : step === "client" ? (
              <ClientDetailsStep
                clientMode={clientMode}
                clientName={clientName}
                clientEmail={clientEmail}
                clientPhoto={clientPhoto}
                clientPhotoUrl={clientPhotoUrl}
                onClientModeChange={setClientMode}
                onClientNameChange={setClientName}
                onClientEmailChange={setClientEmail}
                onClientPhotoChange={setClientPhoto}
                onPickClientPhoto={() => clientPhotoInputRef.current?.click()}
                onContinue={() => setStep("type")}
                inputRef={clientPhotoInputRef}
              />
            ) : (
              step === "type" ? (
                <ProjectTypeStep
                  selectedProjectType={projectType}
                  onProjectTypeChange={setProjectType}
                  onContinue={() => setStep("timeline")}
                />
              ) : (
                step === "timeline" ? (
                  <TimelineStep
                    startDate={startDate}
                    endDate={endDate}
                    onStartDateChange={setStartDate}
                    onEndDateChange={setEndDate}
                    onContinue={() => setStep("roadmap")}
                  />
                ) : (
                  <RoadmapStep
                    mode={roadmapMode}
                    manualPhases={manualPhases}
                    enabledPhases={enabledPhases}
                    addingPhase={addingPhase}
                    newPhaseName={newPhaseName}
                    onModeChange={setRoadmapMode}
                    onPhaseToggle={(phase) => {
                      setEnabledPhases((current) => {
                        const next = new Set(current);
                        if (next.has(phase)) {
                          next.delete(phase);
                        } else {
                          next.add(phase);
                        }
                        return next;
                      });
                    }}
                    onAddPhaseStart={() => setAddingPhase(true)}
                    onNewPhaseNameChange={setNewPhaseName}
                    onAddPhase={() => {
                      const trimmedName = newPhaseName.trim();
                      if (!trimmedName) return;
                      setManualPhases((current) => [...current, trimmedName]);
                      setEnabledPhases((current) => new Set(current).add(trimmedName));
                      setNewPhaseName("");
                      setAddingPhase(false);
                    }}
                    onCreateProject={() => setStep("success")}
                  />
                )
              )
            )}
          </div>

          <div className="flex w-full shrink-0 items-center justify-center opacity-0">
            <p className="w-[261px] text-[13px] font-medium leading-[1.5] text-[#525252]">
              A better way to organize your creative work starts here.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

function BasicDetailsStep({
  projectName,
  projectImage,
  onProjectNameChange,
  onProjectImageChange,
  onPickProjectImage,
  onContinue,
  inputRef,
}: {
  projectName: string;
  projectImage: File | null;
  onProjectNameChange: (value: string) => void;
  onProjectImageChange: (file: File | null) => void;
  onPickProjectImage: () => void;
  onContinue: () => void;
  inputRef: RefObject<HTMLInputElement | null>;
}) {
  return (
    <CreateProjectStepShell
      title="Create New Project"
      description="Let's set it up. This only takes a minute."
      activeStepIndex={0}
    >
      <form
        className="flex w-full flex-col items-start gap-[16px]"
        onSubmit={(event) => {
          event.preventDefault();
          onContinue();
        }}
      >
        <FormCard title="Basic Details">
          <Field label="Project name">
            <input
              value={projectName}
              onChange={(event) => onProjectNameChange(event.target.value)}
              placeholder="Baseframe"
              aria-label="Project name"
              className={inputSurfaceClassName}
            />
          </Field>

          <Field
            label="Project Image"
            secondaryLabel="(Optional)"
          >
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) =>
                onProjectImageChange(event.currentTarget.files?.[0] ?? null)
              }
            />
            <button
              type="button"
              onClick={onPickProjectImage}
              className={cn(
                uploadButtonClassName,
                projectImage ? "text-[#171717]" : "text-[#525252]",
              )}
            >
              <UploadIcon />
              <span className="min-w-0 truncate">
                {projectImage?.name ?? "Upload image"}
              </span>
            </button>
          </Field>
        </FormCard>

        <ContinueButton />
      </form>
    </CreateProjectStepShell>
  );
}

function ClientDetailsStep({
  clientMode,
  clientName,
  clientEmail,
  clientPhoto,
  clientPhotoUrl,
  onClientModeChange,
  onClientNameChange,
  onClientEmailChange,
  onClientPhotoChange,
  onPickClientPhoto,
  onContinue,
  inputRef,
}: {
  clientMode: string;
  clientName: string;
  clientEmail: string;
  clientPhoto: File | null;
  clientPhotoUrl: string;
  onClientModeChange: (value: string) => void;
  onClientNameChange: (value: string) => void;
  onClientEmailChange: (value: string) => void;
  onClientPhotoChange: (file: File | null) => void;
  onPickClientPhoto: () => void;
  onContinue: () => void;
  inputRef: RefObject<HTMLInputElement | null>;
}) {
  return (
    <CreateProjectStepShell
      title="Client Details"
      description="Who is this project for?"
      activeStepIndex={1}
    >
      <form
        className="flex w-full flex-col items-start gap-[16px]"
        onSubmit={(event) => {
          event.preventDefault();
          onContinue();
        }}
      >
        <FormCard title="Client Details" titleWeight="semibold">
          <Field label="Who is this for?">
            <div className="relative w-full">
              <select
                value={clientMode}
                onChange={(event) => onClientModeChange(event.target.value)}
                aria-label="Who is this project for?"
                className={cn(inputSurfaceClassName, "cursor-pointer appearance-none pr-[36px]")}
              >
                <option value="new">Create new client</option>
                <option value="existing">Select existing client</option>
              </select>
              <ChevronDownIcon />
            </div>
          </Field>

          <Field label="Client Name">
            <input
              value={clientName}
              onChange={(event) => onClientNameChange(event.target.value)}
              placeholder="BaseFrame"
              aria-label="Client name"
              className={inputSurfaceClassName}
            />
          </Field>

          <Field label="Client email">
            <input
              value={clientEmail}
              onChange={(event) => onClientEmailChange(event.target.value)}
              placeholder="client@example.com"
              type="email"
              aria-label="Client email"
              className={inputSurfaceClassName}
            />
          </Field>

          <Field label="Client Photo">
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) =>
                onClientPhotoChange(event.currentTarget.files?.[0] ?? null)
              }
            />

            {clientPhoto ? (
              <div className="flex w-full items-center gap-[8px]">
                <img
                  src={clientPhotoUrl}
                  alt=""
                  className="h-[40px] w-[40px] shrink-0 rounded-full object-cover"
                />
                <div className="flex min-w-0 flex-1 items-center justify-between overflow-hidden rounded-[6px] px-[12px] py-[6px]">
                  <button
                    type="button"
                    onClick={onPickClientPhoto}
                    className="flex min-w-0 cursor-pointer items-center gap-[6px] text-[12px] font-medium leading-[1.25] text-[#525252] transition-colors hover:text-[#171717]"
                  >
                    <UploadIcon />
                    <span className="min-w-0 truncate">Reupload</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onClientPhotoChange(null)}
                    className="cursor-pointer text-[12px] font-medium leading-[1.25] text-[#ef4444] transition-colors hover:text-[#b91c1c]"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={onPickClientPhoto}
                className={uploadButtonClassName}
              >
                <UploadIcon />
                <span className="whitespace-nowrap">Upload Photo</span>
              </button>
            )}
          </Field>
        </FormCard>

        <ContinueButton />
      </form>
    </CreateProjectStepShell>
  );
}

function ProjectTypeStep({
  selectedProjectType,
  onProjectTypeChange,
  onContinue,
}: {
  selectedProjectType: ProjectTypeId | null;
  onProjectTypeChange: (projectType: ProjectTypeId) => void;
  onContinue: () => void;
}) {
  return (
    <CreateProjectStepShell
      title="What is the primary project type?"
      description="Pick the closest match for the roadmap. You can still work across multiple disciplines."
      activeStepIndex={2}
      headerGapClassName="gap-[24px]"
      titleClassName="w-[200px]"
      descriptionClassName="w-full"
    >
      <form
        className="flex w-full flex-col items-start gap-[12px]"
        onSubmit={(event) => {
          event.preventDefault();
          if (selectedProjectType) onContinue();
        }}
      >
        <FormCard title="Project Type" titleWeight="semibold" bodyPaddingClassName="p-[4px]">
          <div className="flex w-full items-start gap-[4px]">
            {projectTypeOptions.map((option) => {
              const selected = option.id === selectedProjectType;

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onProjectTypeChange(option.id)}
                  aria-pressed={selected}
                  className={cn(
                    "flex min-h-[104px] min-w-0 flex-1 cursor-pointer items-center justify-center gap-[8px] overflow-hidden rounded-[6px] border px-[12px] py-[44px] text-[12px] font-medium leading-[1.25] transition-colors",
                    selected
                      ? "border-[#dbd9fc] bg-[#e7e6fd] text-[#16115a]"
                      : "border-transparent bg-[#f5f5f5] text-[#525252] hover:bg-[#eeeeee] hover:text-[#171717]",
                  )}
                >
                  <ProjectTypeIcon src={option.iconSrc} />
                  <span className="whitespace-nowrap">{option.label}</span>
                </button>
              );
            })}
          </div>
        </FormCard>

        <ContinueButton disabled={!selectedProjectType} />
      </form>
    </CreateProjectStepShell>
  );
}

function TimelineStep({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onContinue,
}: {
  startDate: string;
  endDate: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onContinue: () => void;
}) {
  return (
    <CreateProjectStepShell
      title="Project timeline"
      description="When does this project start and end?"
      activeStepIndex={3}
      headerGapClassName="gap-[24px]"
      descriptionClassName="w-full"
    >
      <form
        className="flex w-full flex-col items-start gap-[12px]"
        onSubmit={(event) => {
          event.preventDefault();
          onContinue();
        }}
      >
        <FormCard title="Timeline">
          <div className="flex w-full items-start gap-[16px]">
            <Field label="Start">
              <DateInput
                value={startDate}
                onChange={onStartDateChange}
                ariaLabel="Project start date"
              />
            </Field>

            <Field label="End">
              <DateInput
                value={endDate}
                onChange={onEndDateChange}
                ariaLabel="Project end date"
              />
            </Field>
          </div>
        </FormCard>

        <ContinueButton />
      </form>
    </CreateProjectStepShell>
  );
}

function RoadmapStep({
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
}) {
  return (
    <CreateProjectStepShell
      title="Build your roadmap"
      description="How do you want to structure this project?"
      activeStepIndex={mode === "smart" ? 4 : 3}
      headerGapClassName="gap-[24px]"
      descriptionClassName="w-full"
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
              <SmartRoadmapPreview phases={smartRoadmapPhases} />
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

        <CreateProjectButton />
      </form>
    </CreateProjectStepShell>
  );
}

function ProjectCreatedStep({ onViewProject }: { onViewProject: () => void }) {
  return (
    <main className="flex h-screen items-start overflow-hidden bg-white p-[8px]">
      <section className="flex h-full flex-1 flex-col items-center justify-center overflow-hidden rounded-[12px] bg-white shadow-[0px_0.45px_0.5px_0px_rgba(10,10,10,0.25)]">
        <div className="w-full max-w-[460px] py-[22px]">
          <div className="flex w-full flex-col items-start rounded-[12px] bg-[#f5f5f5] p-[4px] shadow-[0px_0.45px_0.5px_0px_rgba(10,10,10,0.25)]">
            <div className="flex w-full flex-col items-start rounded-[8px] bg-[linear-gradient(180deg,rgba(158,153,248,0.18)_0%,rgba(158,153,248,0.07)_34%,#ffffff_72%)] px-[12px] py-[72px] shadow-[0px_0.45px_0.5px_0px_rgba(10,10,10,0.25)]">
              <div className="flex w-full flex-col items-center justify-center gap-[32px]">
                <img
                  src={stageLogoLight}
                  alt="Stage"
                  className="h-[23px] w-auto object-contain"
                />

                <div className="flex w-full items-start">
                  <div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-[8px]">
                    <div className="flex w-full flex-col items-center justify-center">
                      <h1 className="w-full text-center text-[18px] font-semibold leading-[1.2] text-[#0a0a0a]">
                        Project Created!
                      </h1>
                    </div>
                    <p className="w-full text-center text-[12px] font-medium leading-[1.5] text-[#737373]">
                      Your roadmap is ready to go.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onViewProject}
                  className="flex shrink-0 cursor-pointer items-center justify-center gap-[8px] rounded-[6px] border border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7b76df] to-[#463fba] py-[10px] pl-[24px] pr-[22px] text-[13px] font-medium leading-[1.25] text-[#fafafa] shadow-[0px_0.45px_0.5px_0px_rgba(10,10,10,0.25)] transition-opacity hover:opacity-95"
                >
                  <span className="[text-shadow:0px_0.5px_1.5px_rgba(0,0,0,0.15)]">
                    View Project
                  </span>
                  <ArrowRightIcon />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function RadioOption({
  selected,
  label,
  onSelect,
}: {
  selected: boolean;
  label: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex cursor-pointer items-center gap-[8px] text-[13px] font-medium leading-[1.25] text-[#171717]"
      aria-pressed={selected}
    >
      <span
        className={cn(
          "flex h-[14px] w-[14px] shrink-0 items-center justify-center rounded-full",
          selected ? "bg-[#0a0a0a] p-[4px]" : "bg-[#e5e5e5]",
        )}
      >
        {selected ? <span className="h-[6px] w-[6px] rounded-full bg-[#fafafa]" /> : null}
      </span>
      <span>{label}</span>
    </button>
  );
}

function SmartRoadmapPreview({ phases }: { phases: string[] }) {
  return (
    <div className="flex w-full flex-col items-start rounded-[8px] bg-white p-[12px] shadow-[0px_0.45px_0.5px_0px_rgba(10,10,10,0.25)]">
      <div className="flex w-full flex-col items-start justify-center">
        {phases.map((phase, index) => (
          <div key={phase} className="flex items-start justify-center gap-[8px]">
            <div className="flex shrink-0 flex-col items-center justify-center">
              <div className={cn("flex items-center pl-px", index === 0 ? "pt-[4px]" : "")}>
                <span className="flex shrink-0 items-center overflow-hidden rounded-full bg-[#2f2a7d] p-[4px]">
                  <span className="h-[6px] w-[6px] rounded-full bg-[#fafafa]" />
                </span>
              </div>
              {index < phases.length - 1 ? <div className="h-[28px] w-px bg-[#2f2a7d]" /> : null}
            </div>
            <p className={cn("whitespace-nowrap text-[13px] font-medium leading-[1.5] text-[#0a0a0a]", index > 0 ? "pt-[3px]" : "")}>
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

function ToggleSwitch({
  checked,
  onToggle,
}: {
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "flex h-[18px] w-[30px] shrink-0 cursor-pointer items-center overflow-hidden rounded-full p-[2px] transition-colors",
        checked ? "justify-end bg-[#dbd9fc]" : "justify-start bg-[#e5e5e5]",
      )}
      aria-pressed={checked}
    >
      <span className="h-full aspect-square rounded-full bg-[#404040]" />
    </button>
  );
}

function CreateProjectButton() {
  return (
    <button
      type="submit"
      className="flex w-full cursor-pointer items-center justify-center gap-[8px] rounded-[6px] border border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7b76df] to-[#463fba] py-[10px] pl-[10px] pr-[12px] text-[13px] font-medium leading-[1.25] text-[#fafafa] shadow-[0px_0.45px_0.5px_0px_rgba(10,10,10,0.25)] transition-opacity hover:opacity-95"
    >
      <span className="[text-shadow:0px_0.5px_1.5px_rgba(0,0,0,0.15)]">
        Create Project
      </span>
      <ArrowRightIcon />
    </button>
  );
}

function DateInput({
  value,
  onChange,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const displayValue = formatDateInputDisplay(value);

  function openPicker() {
    const input = inputRef.current;
    if (!input) return;

    try {
      input.showPicker?.();
    } catch {
      input.focus();
    }
  }

  return (
    <div className="relative w-full">
      <CalendarIcon />
      <input
        readOnly
        value={displayValue}
        onClick={openPicker}
        placeholder="DD/MM/YYYY"
        aria-label={ariaLabel}
        className={cn(
          inputSurfaceClassName,
          "cursor-pointer pl-[40px]",
        )}
      />
      <input
        ref={inputRef}
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        tabIndex={-1}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
      />
    </div>
  );
}

function formatDateInputDisplay(value: string) {
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return "";
  return `${day}/${month}/${year}`;
}

function CreateProjectStepShell({
  title,
  description,
  activeStepIndex,
  headerGapClassName = "gap-[10px]",
  titleClassName = "w-full",
  descriptionClassName = "w-[261px]",
  children,
}: {
  title: string;
  description: string;
  activeStepIndex: number;
  headerGapClassName?: string;
  titleClassName?: string;
  descriptionClassName?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex w-full flex-col items-start gap-[24px]">
      <div className={cn("flex w-full items-end justify-between", headerGapClassName)}>
        <div className="flex min-w-0 flex-1 flex-col items-start gap-[10px]">
          <div className="flex w-full flex-col items-start">
            <h1 className={cn("text-[21px] font-semibold leading-[1.2] text-[#0a0a0a]", titleClassName)}>
              {title}
            </h1>
          </div>
          <p className={cn("text-[13px] font-medium leading-[1.5] text-[#525252]", descriptionClassName)}>
            {description}
          </p>
        </div>

        <div
          className="flex shrink-0 items-center gap-[4px]"
          aria-label={`Step ${activeStepIndex + 1} of 5`}
        >
          {progressSteps.map((step) => (
            <span
              key={step}
              className={cn(
                "h-[6px] w-[32px] rounded-[2px]",
                step <= activeStepIndex
                  ? "bg-gradient-to-r from-[#8d87ff] via-[rgba(141,135,255,0.75)] to-[#8d87ff]"
                  : "bg-[#e7e6fd]",
              )}
            />
          ))}
        </div>
      </div>

      {children}
    </div>
  );
}

function FormCard({
  title,
  titleWeight = "medium",
  bodyPaddingClassName = "p-[12px]",
  children,
}: {
  title: string;
  titleWeight?: "medium" | "semibold";
  bodyPaddingClassName?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex w-full flex-col items-start rounded-[12px] bg-[#f5f5f5] p-[4px] shadow-[0px_0.45px_0.5px_0px_rgba(10,10,10,0.25)]">
      <div className="flex items-center justify-center px-[12px] pb-[12px] pt-[8px]">
        <p
          className={cn(
            "whitespace-nowrap text-[13px] leading-[1.5] text-[#0a0a0a]",
            titleWeight === "semibold" ? "font-semibold" : "font-medium",
          )}
        >
          {title}
        </p>
      </div>

      <div className={cn("flex w-full flex-col items-start gap-[16px] rounded-[8px] bg-white shadow-[0px_0.45px_0.5px_0px_rgba(10,10,10,0.25)]", bodyPaddingClassName)}>
        {children}
      </div>
    </div>
  );
}

function Field({
  label,
  secondaryLabel,
  children,
}: {
  label: string;
  secondaryLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex w-full flex-col items-start gap-[8px]">
      <span className="flex items-start gap-[6px] whitespace-nowrap text-[13px] font-medium leading-[1.25]">
        <span className="text-[#171717]">{label}</span>
        {secondaryLabel ? <span className="text-[#737373]">{secondaryLabel}</span> : null}
      </span>
      {children}
    </div>
  );
}

function ContinueButton({ disabled = false }: { disabled?: boolean }) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className={cn(
        "flex w-full items-center justify-center gap-[8px] rounded-[6px] border border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7b76df] to-[#463fba] py-[10px] pl-[10px] pr-[12px] text-[13px] font-medium leading-[1.25] text-[#fafafa] shadow-[0px_0.45px_0.5px_0px_rgba(10,10,10,0.25)] transition-opacity",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:opacity-95",
      )}
    >
      <span className="[text-shadow:0px_0.5px_1.5px_rgba(0,0,0,0.15)]">
        Continue
      </span>
      <ArrowRightIcon />
    </button>
  );
}

function ArrowLeftIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className="h-[16px] w-[16px] shrink-0"
    >
      <path
        d="M10 4 6 8l4 4M6.5 8H13"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className="h-[16px] w-[16px] shrink-0"
    >
      <path
        d="M6 4 10 8l-4 4M3 8h6.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function UploadIcon() {
  return (
    <span
      aria-hidden="true"
      className="h-[16px] w-[16px] shrink-0 bg-current"
      style={{
        WebkitMask:
          'url("/logos/dashboard/upload.svg") center / contain no-repeat',
        mask: 'url("/logos/dashboard/upload.svg") center / contain no-repeat',
      }}
    />
  );
}

function ProjectTypeIcon({ src }: { src: string }) {
  return (
    <span
      aria-hidden="true"
      className="h-[16px] w-[16px] shrink-0 bg-current"
      style={{
        WebkitMask: `url("${src}") center / contain no-repeat`,
        mask: `url("${src}") center / contain no-repeat`,
      }}
    />
  );
}

function CalendarIcon() {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute left-[12px] top-1/2 h-[16px] w-[16px] -translate-y-1/2 text-[#525252]"
      style={{
        WebkitMask:
          'url("/logos/dashboard/calendar.svg") center / contain no-repeat',
        mask: 'url("/logos/dashboard/calendar.svg") center / contain no-repeat',
        backgroundColor: "currentColor",
      }}
    />
  );
}

function DragHandleIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className="h-[16px] w-[16px] shrink-0 text-[#404040]"
    >
      <path
        d="M6 4.5h.01M10 4.5h.01M6 8h.01M10 8h.01M6 11.5h.01M10 11.5h.01"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className="h-[16px] w-[16px] shrink-0"
    >
      <path
        d="M8 3.75v8.5M3.75 8h8.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className="pointer-events-none absolute right-[12px] top-1/2 h-[16px] w-[16px] -translate-y-1/2 text-[#171717]"
    >
      <path
        d="m4.5 6.5 3.5 3 3.5-3"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const inputSurfaceClassName =
  "h-[34px] w-full rounded-[6px] bg-[#f5f5f5] px-[12px] py-[10px] text-[12px] font-medium leading-[1.25] text-[#171717] shadow-[0px_0.45px_1px_0px_rgba(10,10,10,0.25)] outline-none transition-colors placeholder:text-[#525252] hover:bg-[#eeeeee] focus:bg-white focus:ring-1 focus:ring-[#8d87ff]";

const uploadButtonClassName =
  "flex h-[34px] w-full cursor-pointer items-center gap-[12px] overflow-hidden rounded-[6px] bg-[#f5f5f5] px-[12px] py-[10px] text-left text-[12px] font-medium leading-[1.25] text-[#525252] shadow-[0px_0.45px_1px_0px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#eeeeee] hover:text-[#171717]";
