import { OnboardingPaywall } from "@/components/onboarding/OnboardingPaywall";
import {
  FigmaOnboardingFrame,
  FigmaLabel,
  FigmaSection,
  FigmaStepHeader,
  TimelineDateField,
  figmaFieldClass,
} from "@/components/onboarding/OnboardingFigmaPrimitives";
import { FigmaIntegrationConfig } from "@/components/onboarding/OnboardingIntegrationPanels";
import { AlmostSetupPreview, ProSuccessCard } from "@/components/onboarding/OnboardingPreviewPanels";
import { FIGMA_PROJECT_TYPE_VALUES, ONBOARDING_ICON_SRC } from "@/components/onboarding/constants";
import { OnboardingMethodStep } from "@/components/onboarding/steps/OnboardingMethodStep";
import { OnboardingPhaseSelectStep } from "@/components/onboarding/steps/OnboardingPhaseSelectStep";
import { PROJECT_TYPES, PROJECT_TYPE_ICONS } from "@/lib/constants";
import { AVATAR_ACCEPT, PROJECT_MARKER_ACCEPT } from "@/lib/r2Uploads";
import { cn } from "@/lib/utils";
import type { UseProjectDraftResult } from "@/features/project-creation/useProjectDraft";
import type { OnboardingStepId } from "@/features/onboarding/model";
import type { ProjectType } from "@/types";
import type { ClaudeConnectionSummary } from "@/types/settings";
import { WelcomeSlide } from "./OnboardingAnimations";
import { OnboardingStepMotion, StepShell } from "./OnboardingPrimitives";

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
  onStartTrial: () => void;
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
  onStartTrial,
  onClaudeActivated,
}: OnboardingStepRendererProps) {
  const { draft } = draftState;

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
                      Client photo
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
    case "method":
      return <OnboardingMethodStep step={step} draftState={draftState} />;
    case "phase-select":
      return <OnboardingPhaseSelectStep draftState={draftState} />;
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
	            onStartTrial={onStartTrial}
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
