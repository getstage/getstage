import {
  ArrowRight,
  Check,
  PencilSimpleLine,
  Trash,
  Plus,
} from "@phosphor-icons/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { OnboardingPaywall } from "@/components/onboarding/OnboardingPaywall";
import { StageDatePicker } from "@/components/ui/StageDatePicker";
import stageLogo from "@/assets/logos/stage-logo-light.png";
import { PROJECT_TYPES, PROJECT_TYPE_ICONS } from "@/lib/constants";
import { AVATAR_ACCEPT, PROJECT_MARKER_ACCEPT } from "@/lib/r2Uploads";
import { cn } from "@/lib/utils";
import type { UseProjectDraftResult } from "@/features/project-creation/useProjectDraft";
import type { OnboardingStepId } from "@/features/onboarding/model";
import type { ProjectType } from "@/types";
import type { ClaudeConnectionSummary } from "@/types/settings";
import { WelcomeSlide } from "./OnboardingAnimations";
import { OnboardingStepMotion, StepShell } from "./OnboardingPrimitives";
const ONBOARDING_ICON_SRC = {
  add: "/logos/add.svg",
  calendar: "/logos/calendar.svg",
  copy: "/logos/copy.svg",
  dots: "/logos/dots.svg",
  download: "/logos/download.svg",
  dropdown: "/logos/dropdown.svg",
};
const INTEGRATION_ICON_SRC = {
  claude: "/logos/integrations/claude.svg",
  codex: "/logos/integrations/codex.svg",
  figma: "/logos/integrations/figma.svg",
  notion: "/logos/integrations/notion.svg",
};
const CALENDAR_DAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const CALENDAR_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const SETUP_PROGRESS_STEPS = ["details", "project-type", "method", "timeline"] as const;
const FIGMA_PROJECT_TYPE_VALUES: ProjectType[] = [
  "branding",
  "web-design",
  "product-design",
  "app-design",
  "packaging",
  "motion-design",
  "illustration",
  "other",
];

function getProgressIndex(step: OnboardingStepId) {
  if (step === "phase-select") {
    return 2;
  }
  if (step === "preview" || step === "creating") {
    return 3;
  }
  return SETUP_PROGRESS_STEPS.indexOf(step as (typeof SETUP_PROGRESS_STEPS)[number]);
}

function FigmaOnboardingFrame({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("w-[min(516px,calc(100vw-40px))]", className)}>
      {children}
    </div>
  );
}

function FigmaOnboardingLogo({ centered = false }: { centered?: boolean }) {
  return (
    <img
      src={stageLogo}
      alt="Stage"
      className={cn("h-[23px] w-auto", centered && "mx-auto")}
    />
  );
}

function FigmaStepHeader({
  step,
  title = "Create a new project",
  subtitle = "Set up the basics to get started",
  showProgress = true,
}: {
  step: OnboardingStepId;
  title?: string;
  subtitle?: string;
  showProgress?: boolean;
}) {
  const progressIndex = getProgressIndex(step);

  return (
    <>
      <FigmaOnboardingLogo />
      <div className="mt-8 flex w-full items-end justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="text-[21px] leading-[1.2] font-semibold text-[#0A0A0A]">
            {title}
          </h3>
          <p className="mt-2.5 text-[13px] leading-[1.5] font-medium text-[#525252]">
            {subtitle}
          </p>
        </div>
        {showProgress && progressIndex >= 0 ? (
          <div className="mb-1 flex shrink-0 items-center gap-1">
            {SETUP_PROGRESS_STEPS.map((item, index) => (
              <span
                key={item}
                className={cn(
                  "h-[6px] w-8 rounded-[2px]",
                  index <= progressIndex
                    ? "bg-gradient-to-r from-[#8D87FF] via-[rgba(141,135,255,0.75)] to-[#8D87FF]"
                    : "bg-[#E7E6FD]",
                )}
              />
            ))}
          </div>
        ) : null}
      </div>
    </>
  );
}

function FigmaSection({
  label,
  children,
  className,
  innerClassName,
}: {
  label?: string;
  children: ReactNode;
  className?: string;
  innerClassName?: string;
}) {
  return (
    <div className={cn("rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]", className)}>
      {label ? (
        <div className="px-3 pb-2.5 pt-2.5 text-[13px] font-bold text-[#0A0A0A]">
          {label}
        </div>
      ) : null}
      <div className={cn("rounded-[8px] bg-white p-4 shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]", innerClassName)}>
        {children}
      </div>
    </div>
  );
}

function FigmaLabel({ children }: { children: ReactNode }) {
  return <label className="mb-2 block text-[13px] font-medium text-[#171717]">{children}</label>;
}

const figmaFieldClass =
  "h-10 w-full rounded-[6px] border border-transparent bg-[#F5F5F5] px-3 text-[12px] font-medium text-[#525252] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] outline-none transition-colors placeholder:text-[#737373] focus:border-[#E5E5E5] focus:bg-white";

function formatDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseDateInputValue(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) {
    return null;
  }

  return new Date(year, month - 1, day);
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

function isSameCalendarDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function TimelineDateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative flex-1">
      <label className="mb-2 block text-[13px] font-semibold text-text-primary">{label}</label>
      <StageDatePicker
        value={value}
        onChange={onChange}
        ariaLabel={`Project ${label.toLowerCase()} date`}
      />
    </div>
  );
}

type OnboardingStepRendererProps = {
  step: OnboardingStepId;
  userName?: string;
  fieldOfWork: ProjectType[];
  onSelectField: (value: ProjectType) => void;
  draftState: UseProjectDraftResult;
  stepError: string | null;
  creationReady: boolean;
  isCheckoutLoading: boolean;
  checkoutError: string | null;
  claudeConnection: ClaudeConnectionSummary;
  claudeSetupHref: string;
  claudeInstallCommand: string;
  claudeConnectionId: string | null;
  onContinue: () => void;
  onCreationDone: () => void;
  onContinueFree: () => void;
  onClaudeActivated: () => void;
};

export function OnboardingStepRenderer({
  step,
  userName,
  fieldOfWork,
  onSelectField,
  draftState,
  stepError,
  isCheckoutLoading,
  checkoutError,
  claudeConnection,
  onContinue,
  onContinueFree,
  onClaudeActivated,
}: OnboardingStepRendererProps) {
  const { draft } = draftState;
  const [isAddingPhase, setIsAddingPhase] = useState(false);
  const [newPhaseName, setNewPhaseName] = useState("");

  function submitNewPhase() {
    const phaseName = newPhaseName.trim();
    if (!phaseName) {
      return;
    }

    draftState.addPhase(phaseName);
    setNewPhaseName("");
    setIsAddingPhase(false);
  }

  switch (step) {
    case "welcome":
      return (
        <OnboardingStepMotion motionKey="welcome">
          <WelcomeSlide userName={userName} />
        </OnboardingStepMotion>
      );
    case "personalise":
      return (
        <OnboardingStepMotion motionKey="personalise">
          <StepShell label="Field of work">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {PROJECT_TYPES.map((option) => {
                const iconSrc = PROJECT_TYPE_ICONS[option.value];
                const isSelected = fieldOfWork.includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => onSelectField(option.value)}
                    className={cn(
                      "flex cursor-pointer items-center justify-center gap-2 rounded-[10px] border-[1.5px] bg-[#F5F5F7] px-4 py-4 text-[14px] font-medium transition-colors focus:outline-none",
                      isSelected
                        ? "border-accent bg-[rgba(135,130,245,0.09)] text-accent"
                        : "border-transparent text-text-primary hover:bg-[#EFEFF2]",
                    )}
                  >
                    {iconSrc ? (
                      <img src={iconSrc} alt="" className="h-4 w-4 shrink-0 object-contain" />
                    ) : null}
                    <span>{option.label}</span>
                  </button>
                );
              })}
            </div>
          </StepShell>
        </OnboardingStepMotion>
      );
    case "claude":
      return (
        <OnboardingStepMotion motionKey="claude">
          <FigmaIntegrationConfig
            claudeConnection={claudeConnection}
            onActivate={onClaudeActivated}
          />
        </OnboardingStepMotion>
      );
    case "details":
      return (
        <OnboardingStepMotion motionKey="details">
          <FigmaOnboardingFrame>
            <FigmaStepHeader step={step} />
            <div className="mt-6 space-y-3">
              <FigmaSection label="Project Basics">
                <div className="space-y-4">
                  <div>
                    <FigmaLabel>Project name</FigmaLabel>
                    <input
                      type="text"
                      value={draft.projectName}
                      onChange={(event) => draftState.setProjectName(event.target.value)}
                      placeholder="Baseframe"
                      autoFocus
                      className={figmaFieldClass}
                    />
                  </div>

                  <div>
                    <FigmaLabel>
                      Project image <span className="text-[#737373]">(Optional)</span>
                    </FigmaLabel>
                    <button
                      type="button"
                      onClick={() => draftState.projectImageInputRef.current?.click()}
                      className="flex h-10 w-full cursor-pointer items-center gap-3 rounded-[6px] bg-[#F5F5F5] px-3 text-left text-[12px] font-medium text-[#525252] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#EFEFEF]"
                    >
                      <img src={ONBOARDING_ICON_SRC.download} alt="" className="h-4 w-4 shrink-0 opacity-70" />
                      <span>{draft.projectImage ? "Replace project image" : "Upload project image"}</span>
                    </button>
                    <input
                      ref={draftState.projectImageInputRef}
                      type="file"
                      accept={PROJECT_MARKER_ACCEPT}
                      className="hidden"
                      onChange={(event) => {
                        void draftState.handleProjectImageFileChange(event);
                      }}
                    />
                  </div>
                </div>
              </FigmaSection>

              <FigmaSection label="Client Details">
                <div className="space-y-4">
                  <div>
                    <FigmaLabel>Client Name</FigmaLabel>
                    <input
                      type="text"
                      value={draft.clientName}
                      onChange={(event) => draftState.setClientName(event.target.value)}
                      placeholder="Baseframe"
                      className={figmaFieldClass}
                    />
                  </div>

                  <div>
                    <FigmaLabel>Client email</FigmaLabel>
                    <input
                      type="email"
                      value={draft.clientEmail}
                      onChange={(event) => draftState.setClientEmail(event.target.value)}
                      placeholder="client@example.com"
                      className={figmaFieldClass}
                    />
                  </div>

                  <div>
                    <FigmaLabel>
                      Client photo <span className="text-[#737373]">(Optional)</span>
                    </FigmaLabel>
                    <button
                      type="button"
                      onClick={() => draftState.fileInputRef.current?.click()}
                      className="flex h-10 w-full cursor-pointer items-center gap-3 rounded-[6px] bg-[#F5F5F5] px-3 text-left text-[12px] font-medium text-[#525252] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#EFEFEF]"
                    >
                      <img src={ONBOARDING_ICON_SRC.download} alt="" className="h-4 w-4 shrink-0 opacity-70" />
                      <span>{draft.clientAvatar ? "Replace client photo" : "Upload client photo"}</span>
                    </button>
                    <input
                      ref={draftState.fileInputRef}
                      type="file"
                      accept={AVATAR_ACCEPT}
                      className="hidden"
                      onChange={(event) => {
                        void draftState.handleAvatarFileChange(event);
                      }}
                    />
                  </div>
                </div>
              </FigmaSection>
            </div>
          </FigmaOnboardingFrame>
        </OnboardingStepMotion>
      );
    case "project-type":
      return (
        <OnboardingStepMotion motionKey="project-type">
          <FigmaOnboardingFrame>
            <FigmaStepHeader step={step} />
            <div className="mt-6">
              <FigmaSection label="Project Type" innerClassName="p-1">
                <div className="grid grid-cols-2 gap-1">
                  {PROJECT_TYPES.filter((option) =>
                    FIGMA_PROJECT_TYPE_VALUES.includes(option.value),
                  ).map((option) => {
                    const iconSrc = PROJECT_TYPE_ICONS[option.value];
                    const isSelected = draft.projectType === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => draftState.setProjectType(option.value)}
                        className={cn(
                          "flex h-[74px] min-w-0 cursor-pointer items-center justify-center gap-2 rounded-[6px] border px-3 text-[12px] font-medium transition-colors focus:outline-none sm:h-[74px] md:h-[74px] lg:h-[74px]",
                          isSelected
                            ? "border-[#DBD9FC] bg-[#E7E6FD] text-[#16115A]"
                            : "border-transparent bg-[#F5F5F5] text-[#525252]",
                        )}
                      >
                        {iconSrc ? (
                          <img src={iconSrc} alt="" className="h-4 w-4 shrink-0 opacity-80" />
                        ) : null}
                        <span className="min-w-0 truncate">{option.label}</span>
                      </button>
                    );
                  })}
                </div>
              </FigmaSection>
            </div>
          </FigmaOnboardingFrame>
        </OnboardingStepMotion>
      );
    case "method": {
      const activePhases = draft.phases.filter((phase) => phase.on);
      const roadmapItems = activePhases;
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
    case "phase-select":
      return (
        <OnboardingStepMotion motionKey="phase-select">
          <StepShell label="Select phases">
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
                  "flex items-center gap-3 py-2.5",
                  index < draft.phases.length - 1 ? "border-b border-border-subtle" : "",
                )}
              >
                <div className="flex w-4 shrink-0 cursor-grab flex-col items-center gap-0.5 text-text-tertiary">
                  <span className="h-[1.5px] w-3 rounded bg-current" />
                  <span className="h-[1.5px] w-3 rounded bg-current" />
                  <span className="h-[1.5px] w-3 rounded bg-current" />
                </div>
                {draftState.editingPhaseId === phase.id ? (
                  <input
                    autoFocus
                    defaultValue={phase.name}
                    onBlur={(event) => {
                      draftState.renamePhase(phase.id, event.target.value);
                      draftState.setEditingPhaseId(null);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        draftState.renamePhase(phase.id, event.currentTarget.value);
                        draftState.setEditingPhaseId(null);
                      }
                      if (event.key === "Escape") {
                        draftState.setEditingPhaseId(null);
                      }
                    }}
                    className="h-8 flex-1 rounded-md border border-border bg-white px-2.5 text-[14px] text-text-primary outline-none"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => draftState.setEditingPhaseId(phase.id)}
                    className={cn(
                      "flex-1 cursor-pointer text-left text-[14px]",
                      phase.on ? "text-text-primary" : "text-text-tertiary",
                    )}
                  >
                    {phase.name}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => draftState.setEditingPhaseId(phase.id)}
                  className="cursor-pointer text-text-tertiary transition-colors hover:text-text-primary"
                  aria-label={`Rename ${phase.name}`}
                >
                  <PencilSimpleLine size={15} weight="regular" />
                </button>

                <button
                  type="button"
                  onClick={() => draftState.removePhase(phase.id)}
                  disabled={draft.phases.length <= 1}
                  className="cursor-pointer text-text-tertiary transition-colors hover:text-destructive disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label={`Remove ${phase.name}`}
                >
                  <Trash size={15} weight="regular" />
                </button>

                <button
                  type="button"
                  onClick={() => draftState.togglePhase(phase.id)}
                  className={cn(
                    "relative h-5 w-9 shrink-0 cursor-pointer rounded-[10px] transition-colors focus:outline-none",
                    phase.on ? "bg-accent" : "bg-[#D9D9D9]",
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all",
                      phase.on ? "left-[18px]" : "left-0.5",
                    )}
                  />
                </button>
              </div>
            ))}
          </div>

            <button
              type="button"
              onClick={() => draftState.addPhase()}
              className="mt-2 inline-flex cursor-pointer items-center gap-1 text-[13px] font-medium text-accent transition-colors hover:text-accent-hover"
            >
              <Plus size={14} weight="bold" />
              Add phase
            </button>
          </StepShell>
        </OnboardingStepMotion>
      );
    case "timeline":
      return (
        <OnboardingStepMotion motionKey="timeline">
          <FigmaOnboardingFrame>
            <FigmaStepHeader step={step} />
            <div className="mt-6">
              <FigmaSection label="Timeline">
                <div className="flex gap-4">
                  <TimelineDateField
                    label="Start"
                    value={draft.startDate}
                    onChange={draftState.setStartDate}
                  />
                  <TimelineDateField
                    label="End"
                    value={draft.endDate}
                    onChange={draftState.setEndDate}
                  />
                </div>
              </FigmaSection>
            </div>
          </FigmaOnboardingFrame>
        </OnboardingStepMotion>
      );
    case "preview":
      return (
        <OnboardingStepMotion motionKey="preview" className="flex h-full w-full justify-center">
          <AlmostSetupPreview onContinue={onContinue} errorMessage={stepError} />
        </OnboardingStepMotion>
      );
    case "integrations":
      return (
        <OnboardingStepMotion motionKey="integrations">
          <FigmaOnboardingFrame>
            <FigmaStepHeader
              step={step}
              title="Bring your project to life"
              subtitle="Connect your tools to sync files, tasks, and updates"
              showProgress={false}
            />
            <div className="mt-8">
              <FigmaSection label="Select tools you want to integrate">
                <ul className="space-y-4">
                  <li className="flex items-center gap-3">
                    <img
                      src="/logos/integrations/claude.svg"
                      alt=""
                      className="h-5 w-5 shrink-0 object-contain"
                    />
                    <span className="text-[13px] font-medium text-[#0A0A0A]">
                      Claude
                    </span>
                  </li>
                  <li className="flex items-center gap-3">
                    <img
                      src="/logos/integrations/codex.svg"
                      alt=""
                      className="h-5 w-5 shrink-0 object-contain"
                    />
                    <span className="text-[13px] font-medium text-[#0A0A0A]">
                      Codex
                    </span>
                  </li>
                  <li className="flex items-center gap-3">
                    <img
                      src="/logos/integrations/figma.svg"
                      alt=""
                      className="h-5 w-5 shrink-0 object-contain"
                    />
                    <span className="text-[13px] font-medium text-[#0A0A0A]">
                      Figma
                    </span>
                  </li>
                  <li className="flex items-center gap-3">
                    <img
                      src="/logos/integrations/notion.svg"
                      alt=""
                      className="h-5 w-5 shrink-0 object-contain"
                    />
                    <span className="text-[13px] font-medium text-[#0A0A0A]">
                      Notion
                    </span>
                  </li>
                </ul>
              </FigmaSection>
            </div>
          </FigmaOnboardingFrame>
        </OnboardingStepMotion>
      );
    case "celebrating":
      return (
        <OnboardingStepMotion motionKey="celebrating">
          <FigmaOnboardingFrame>
            <ProSuccessCard />
          </FigmaOnboardingFrame>
        </OnboardingStepMotion>
      );
    case "paywall":
      return (
        <OnboardingStepMotion motionKey="paywall">
          <FigmaOnboardingFrame>
	          <OnboardingPaywall
	            onContinueFree={onContinueFree}
	            isUpgradeLoading={isCheckoutLoading}
	            upgradeError={checkoutError}
	          />
          </FigmaOnboardingFrame>
        </OnboardingStepMotion>
      );
    default:
      return null;
  }
}

function AlmostSetupPreview({
  onContinue,
  errorMessage,
}: {
  onContinue: () => void;
  errorMessage: string | null;
}) {
  return (
    <div className="h-full w-full">
      <div className="grid h-full w-full overflow-hidden bg-white md:grid-cols-[570fr_846fr]">
        <div className="flex min-h-0 items-center overflow-hidden px-[clamp(24px,5.03vw,72px)]">
          <div className="flex w-full flex-col items-start gap-4 sm:gap-8">
            <img src={stageLogo} alt="Stage" className="h-[23px] w-auto" />
            <div>
              <h3 className="text-[21px] leading-[1.2] font-semibold text-[#0A0A0A]">
                You&apos;re almost setup.
              </h3>
              <p className="mt-2.5 text-[13px] leading-[1.5] font-medium text-[#525252]">
                Here&apos;s your workspace, set up and ready to go
              </p>
            </div>
            <button
              type="button"
              onClick={onContinue}
              className="flex h-9 w-full cursor-pointer items-center justify-center gap-2 rounded-[6px] border border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7B76DF] to-[#463FBA] pl-2.5 pr-3 text-[13px] font-medium text-[#FAFAFA] shadow-[0_0.45px_1px_rgba(10,10,10,0.25),0_0.5px_1.5px_rgba(0,0,0,0.15)] transition-opacity hover:opacity-95 focus:outline-none"
            >
              <span>Continue</span>
              <ArrowRight size={16} weight="bold" />
            </button>
          </div>
        </div>
        <div className="hidden min-h-0 bg-white py-2 pr-2 md:block">
          <img
            src="/onboarding/onboarding-setup.webp"
            alt=""
            className="h-full w-full object-contain object-right"
          />
        </div>
      </div>
      {errorMessage ? (
        <p className="mt-4 text-[13px] leading-normal text-destructive">{errorMessage}</p>
      ) : null}
    </div>
  );
}

function ProSuccessCard() {
  return (
    <div className="mx-auto w-full max-w-[520px] rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
      <div className="rounded-[8px] bg-gradient-to-b from-[rgba(158,153,248,0.12)] to-white px-6 py-[72px] text-center shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
        <img src={stageLogo} alt="Stage" className="mx-auto h-[22px] w-auto" />
        <h3 className="mt-8 font-heading text-[18px] font-semibold leading-[1.2] text-text-primary">
          You&apos;re on Pro now 🚀
        </h3>
        <p className="mx-auto mt-2 max-w-[422px] text-[12px] font-medium leading-[1.5] text-text-secondary">
          Unlock advanced workflows, deeper integrations, and faster execution. Connect Claude,
          Figma, and your tools to start building your workspace.
        </p>
      </div>
    </div>
  );
}

function ConnectedBadge() {
  return (
    <span className="inline-flex h-8 items-center gap-1.5 rounded-[6px] bg-[#F0FDF4] px-3 text-[12px] font-medium text-[#00A63E]">
      <Check size={16} weight="bold" />
      Connected
    </span>
  );
}

function ConnectButton({ children, onClick }: { children: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-8 cursor-pointer rounded-[6px] bg-[#F5F5F5] px-3 text-[12px] font-medium text-[#525252] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#EFEFEF]"
    >
      {children}
    </button>
  );
}

function IntegrationRow({
  iconSrc,
  label,
  connected = false,
  actionLabel,
  onAction,
}: {
  iconSrc: string;
  label: string;
  connected?: boolean;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <li className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2">
        <img src={iconSrc} alt="" className="h-4 w-4 shrink-0 object-contain" />
        <span className="truncate text-[13px] font-medium text-[#171717]">{label}</span>
      </div>
      {connected ? <ConnectedBadge /> : actionLabel ? <ConnectButton onClick={onAction}>{actionLabel}</ConnectButton> : null}
    </li>
  );
}

function FigmaIntegrationConfig({
  claudeConnection,
  onActivate,
}: {
  claudeConnection: ClaudeConnectionSummary;
  onActivate: () => void;
}) {
  const [view, setView] = useState<"list" | "codex" | "claude" | "connecting-figma" | "connecting-notion">("list");
  const [codexKey, setCodexKey] = useState("");
  const [claudeKey, setClaudeKey] = useState("");
  const [connectedTools, setConnectedTools] = useState({
    codex: false,
    figma: false,
    notion: false,
  });
  const codexConnected = connectedTools.codex;
  const figmaConnected = connectedTools.figma;
  const notionConnected = connectedTools.notion;
  const claudeConnected =
    Boolean(claudeKey) ||
    (claudeConnection?.status === "connected" && claudeConnection.stageApiVerified);

  function generateKey(kind: "codex" | "claude") {
    const nextKey = kind === "codex" ? "sk_live_x7f3k92hdk28s9dk3h" : "sk_live_x7f3k92hdk28s9dk3h";
    if (kind === "codex") {
      setCodexKey(nextKey);
      return;
    }
    setClaudeKey(nextKey);
  }

  function showConnecting(tool: "figma" | "notion") {
    setView(tool === "figma" ? "connecting-figma" : "connecting-notion");
    window.setTimeout(() => {
      setConnectedTools((current) => ({ ...current, [tool]: true }));
      setView("list");
    }, 900);
  }

  if (view === "connecting-figma" || view === "connecting-notion") {
    return (
      <IntegrationConnectingState
        tool={view === "connecting-figma" ? "figma" : "notion"}
      />
    );
  }

  if (view === "codex") {
    return (
      <IntegrationSetupState
        provider="codex"
        apiKey={codexKey}
        onGenerateKey={() => generateKey("codex")}
        onActivate={() => {
          setConnectedTools((current) => ({ ...current, codex: true }));
          setView("list");
        }}
      />
    );
  }

  if (view === "claude") {
    return (
      <IntegrationSetupState
        provider="claude"
        apiKey={claudeKey}
        onGenerateKey={() => generateKey("claude")}
        onActivate={() => setView("list")}
      />
    );
  }

  return (
    <FigmaOnboardingFrame>
      <FigmaStepHeader
        step="claude"
        title="Configure your integration"
        subtitle="Connect your tools to sync files, tasks, and updates"
        showProgress={false}
      />
      <div className="mt-6 space-y-3">
        <FigmaSection label="Select one model">
          <ul className="space-y-4">
            <IntegrationRow
              iconSrc={INTEGRATION_ICON_SRC.codex}
              label="Codex"
              connected={codexConnected}
              actionLabel="Connect Codex"
              onAction={() => setView("codex")}
            />
            <IntegrationRow
              iconSrc={INTEGRATION_ICON_SRC.claude}
              label="Claude"
              connected={claudeConnected}
              actionLabel="Connect Claude"
              onAction={() => setView("claude")}
            />
          </ul>
        </FigmaSection>
        <FigmaSection label="Select tools you want to integrate">
          <ul className="space-y-4">
            <IntegrationRow
              iconSrc={INTEGRATION_ICON_SRC.figma}
              label="Figma"
              connected={figmaConnected}
              actionLabel="Connect Figma"
              onAction={() => showConnecting("figma")}
            />
            <IntegrationRow
              iconSrc={INTEGRATION_ICON_SRC.notion}
              label="Notion"
              connected={notionConnected}
              actionLabel="Connect Notion"
              onAction={() => showConnecting("notion")}
            />
          </ul>
        </FigmaSection>
        <button
          type="button"
          onClick={onActivate}
          className="inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-[6px] border border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7B76DF] to-[#463FBA] px-5 text-[13px] font-medium text-white shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] transition-opacity hover:opacity-95 focus:outline-none"
        >
          Get Started
          <ArrowRight size={16} weight="bold" />
        </button>
      </div>
    </FigmaOnboardingFrame>
  );
}

function IntegrationConnectingState({ tool }: { tool: "figma" | "notion" }) {
  const label = tool === "figma" ? "Figma" : "Notion";
  const iconSrc = tool === "figma" ? INTEGRATION_ICON_SRC.figma : INTEGRATION_ICON_SRC.notion;

  return (
    <FigmaOnboardingFrame className="py-[22px]">
      <div className="flex w-full flex-col items-center justify-center py-[22px] text-center">
        <div className="flex flex-col items-center gap-3">
          <img
            src={iconSrc}
            alt=""
            className={cn(tool === "figma" ? "h-7 w-[19px]" : "h-6 w-[23px]", "object-contain")}
          />
          <h3 className="text-[21px] leading-[1.2] font-semibold text-[#0A0A0A]">
            Connecting {label}
          </h3>
        </div>
        <p className="mt-2 text-[13px] leading-[1.5] font-medium text-[#525252]">
          You&apos;ll be redirected to {label} to securely authorize access.
        </p>
      </div>
    </FigmaOnboardingFrame>
  );
}

function IntegrationSetupState({
  provider,
  apiKey,
  onGenerateKey,
  onActivate,
}: {
  provider: "codex" | "claude";
  apiKey: string;
  onGenerateKey: () => void;
  onActivate: () => void;
}) {
  const isClaude = provider === "claude";
  const providerLabel = isClaude ? "Claude" : "Codex";
  const maskedKey = "*******************";
  const displayKey = apiKey || maskedKey;
  const setupText = `# ${providerLabel} Configuration

API_KEY=${apiKey || "[Your API key here]"}

You are an expert product engineer working on a modern SaaS application.

- Write clean, production-ready code
- Maintain consistent structure and naming
- Optimize for readability and scalability
- Avoid breaking existing functionality

UI Guidelines:
- Use modern, minimal design patterns
- Ensure spacing, hierarchy, and responsiveness

Always return complete, usable code.`;

  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedSetup, setCopiedSetup] = useState(false);

  function handleCopy(text: string, type: "key" | "setup") {
    void navigator.clipboard.writeText(text);
    if (type === "key") {
      setCopiedKey(true);
      window.setTimeout(() => setCopiedKey(false), 2000);
    } else {
      setCopiedSetup(true);
      window.setTimeout(() => setCopiedSetup(false), 2000);
    }
  }

  return (
    <FigmaOnboardingFrame>
      <FigmaStepHeader
        step="claude"
        title={`Set up ${providerLabel}`}
        subtitle={
          isClaude
            ? "Connect Claude to power conversations, reasoning, and content generation in your workspace."
            : "Give Stage access to generate, update, and manage your code seamlessly."
        }
        showProgress={false}
      />
      <div className="mt-6 space-y-3">
        <div className="rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
          <div className="rounded-[8px] bg-white p-3 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <img
                  src={isClaude ? INTEGRATION_ICON_SRC.claude : INTEGRATION_ICON_SRC.codex}
                  alt=""
                  className="h-4 w-4 object-contain"
                />
                <span className="text-[13px] font-medium text-[#171717]">{providerLabel}</span>
              </div>
              <span className="flex h-4 w-[30px] items-center justify-end rounded-full bg-[#DBD9FC] p-0.5">
                <span className="h-3 w-3 rounded-full bg-[#221E6C]" />
              </span>
            </div>
          </div>

          <div className="mt-1 rounded-[8px] bg-white p-3 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
            <p className="text-[13px] font-medium text-[#171717]">API Key</p>
            <div className="mt-2 flex h-[31px] items-center justify-between gap-3 rounded-[6px] bg-[#F5F5F5] py-1 pl-3 pr-1 text-[12px] font-medium text-[#525252] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
              <span className="min-w-0 truncate">{displayKey}</span>
              {apiKey ? (
                <button
                  type="button"
                  onClick={() => handleCopy(apiKey, "key")}
                  className={cn(
                    "grid h-[18px] w-[18px] shrink-0 cursor-pointer place-items-center rounded-[4px] transition-colors",
                    copiedKey ? "bg-green-50" : "hover:bg-white",
                  )}
                  aria-label={`Copy ${providerLabel} API key`}
                >
                  {copiedKey ? (
                    <Check size={12} weight="bold" className="text-green-600" />
                  ) : (
                    <img src={ONBOARDING_ICON_SRC.copy} alt="" className="h-[18px] w-[18px]" />
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onGenerateKey}
                  className="h-[23px] shrink-0 cursor-pointer rounded-[6px] border border-[#525252] bg-gradient-to-b from-[#404040] to-[#0A0A0A] px-2.5 text-[12px] font-medium text-[#FAFAFA] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]"
                >
                  Generate Key
                </button>
              )}
            </div>
          </div>

          <div className="mt-1 rounded-[8px] bg-white p-3 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
            <p className="text-[13px] font-medium text-[#171717]">Auto-generated Setup</p>
            <div className="mt-2 flex h-[308px] items-start gap-3 overflow-y-auto rounded-[6px] bg-[#F5F5F5] py-2.5 pl-3 pr-1 shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
              <pre className="min-w-0 flex-1 whitespace-pre-wrap text-[12px] leading-[1.5] font-medium text-[#525252]">
                {setupText}
              </pre>
              {apiKey ? (
                <button
                  type="button"
                  onClick={() => handleCopy(setupText, "setup")}
                  className={cn(
                    "sticky top-0 grid h-[18px] w-[18px] shrink-0 cursor-pointer place-items-center rounded-[4px] transition-colors",
                    copiedSetup ? "bg-green-50" : "hover:bg-white",
                  )}
                  aria-label={`Copy ${providerLabel} setup`}
                >
                  {copiedSetup ? (
                    <Check size={12} weight="bold" className="text-green-600" />
                  ) : (
                    <img src={ONBOARDING_ICON_SRC.copy} alt="" className="h-[18px] w-[18px]" />
                  )}
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onActivate}
          disabled={!apiKey}
          className="inline-flex h-9 w-full cursor-pointer items-center justify-center gap-2 rounded-[6px] border border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7B76DF] to-[#463FBA] px-5 text-[13px] font-medium text-white opacity-50 shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:hover:opacity-50 enabled:opacity-100 focus:outline-none"
        >
          Activate {providerLabel}
          <ArrowRight size={16} weight="bold" />
        </button>
      </div>
    </FigmaOnboardingFrame>
  );
}
