import { PencilSimpleLine, Trash } from "@phosphor-icons/react";
import integrationsImage from "@/assets/onboarding/integrations.webp";
import { OnboardingPaywall } from "@/components/onboarding/OnboardingPaywall";
import { Avatar } from "@/components/ui/Avatar";
import { PROJECT_TYPES } from "@/lib/constants";
import { AVATAR_ACCEPT, PROJECT_MARKER_ACCEPT } from "@/lib/r2Uploads";
import { cn } from "@/lib/utils";
import type { UseProjectDraftResult } from "@/features/project-creation/useProjectDraft";
import type { OnboardingStepId } from "@/features/onboarding/model";
import type { ProjectType } from "@/types";
import type { ClaudeConnectionSummary } from "@/types/settings";
import { CreatingDashboardText, LoadingStage, StaticOnboardingImage, WelcomeSlide } from "./OnboardingAnimations";
import { GuideLink, OnboardingStepMotion, OptionCard } from "./OnboardingPrimitives";

const GOOGLE_SHEETS_ICON_SRC = new URL("../../assets/icons/google-sheets.svg", import.meta.url).href;
const STRIPE_ICON_SRC = new URL("../../assets/icons/stripe.svg", import.meta.url).href;
const GOOGLE_SHEETS_TEMPLATE_HREF =
  "https://docs.google.com/spreadsheets/d/1vtsJxrdv0LBbLgKAjnEbkFc89NlrPAMrWmnEcqGjvB0/edit?gid=246791924#gid=246791924";

type OnboardingStepRendererProps = {
  step: OnboardingStepId;
  userName?: string;
  googleSheetsGuideHref?: string | null;
  fieldOfWork: ProjectType[];
  onSelectField: (value: ProjectType) => void;
  draftState: UseProjectDraftResult;
  previewRoadmap: Array<{ name: string; tasks: string[] }>;
  sheetUrl: string;
  csvConnected: boolean;
  csvImported: boolean;
  csvImporting: boolean;
  creationReady: boolean;
  isCheckoutLoading: boolean;
  checkoutError: string | null;
  existingClients: Array<{
    id: string;
    name: string;
    email?: string;
    avatarUrl?: string;
    projectCount: number;
  }>;
  claudeConnection: ClaudeConnectionSummary;
  claudeSetupHref: string;
  claudeInstallCommand: string;
  onSheetUrlChange: (value: string) => void;
  onToggleCsvConnection: () => void;
  onLinkSheetUrl: () => void;
  onCreationDone: () => void;
  onContinueFree: () => void;
  onUpgrade: (billingCycle: "monthly" | "yearly") => void;
};

export function OnboardingStepRenderer({
  step,
  userName,
  googleSheetsGuideHref,
  fieldOfWork,
  onSelectField,
  draftState,
  previewRoadmap,
  sheetUrl,
  csvConnected,
  csvImported,
  csvImporting,
  creationReady,
  isCheckoutLoading,
  checkoutError,
  existingClients,
  claudeConnection,
  claudeSetupHref,
  claudeInstallCommand,
  onSheetUrlChange,
  onToggleCsvConnection,
  onLinkSheetUrl,
  onCreationDone,
  onContinueFree,
  onUpgrade,
}: OnboardingStepRendererProps) {
  const { draft } = draftState;
  const selectedClient =
    draft.clientMode === "existing"
      ? existingClients.find((client) => client.name === draft.selectedExistingClientName) ?? null
      : null;

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
          <h3 className="font-heading text-[24px] leading-[1.15] font-semibold tracking-[-0.4px] text-text-primary">
            Personalise your workspace
          </h3>
          <p className="mt-2 text-[15px] leading-normal text-text-secondary">
            Choose one or more fields so Stage can tailor your workspace.
          </p>

          <div className="mt-7 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {PROJECT_TYPES.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onSelectField(option.value)}
                className={cn(
                  "cursor-pointer rounded-[10px] border-[1.5px] px-4 py-3 text-[14px] font-medium transition-colors focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0",
                  fieldOfWork.includes(option.value)
                    ? "border-accent bg-[rgba(135,130,245,0.09)] text-accent"
                    : "border-transparent bg-input-bg text-text-primary hover:bg-[#EFEFF2]",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </OnboardingStepMotion>
      );
    case "details":
      return (
        <OnboardingStepMotion motionKey="details">
          <h3 className="mb-2 text-center font-heading text-[24px] font-semibold tracking-[-0.4px] text-text-primary">
            New project
          </h3>
          <p className="mb-8 text-center text-[15px] leading-normal text-text-secondary">
            Let&apos;s set it up. This only takes a minute.
          </p>

          <div className="mb-4">
            <label className="mb-1.5 block text-[13px] font-medium text-text-primary">
              Project name
            </label>
            <input
              type="text"
              value={draft.projectName}
              onChange={(event) => draftState.setProjectName(event.target.value)}
              placeholder="Website Redesign"
              autoFocus
              className="w-full rounded-[10px] border border-transparent bg-input-bg px-4 py-3 text-[15px] text-text-primary outline-none transition-all duration-200 placeholder:text-text-tertiary focus:border-border focus:bg-white"
            />
          </div>

          <div className="mb-6">
            <label className="mb-1.5 block text-[13px] font-medium text-text-primary">
              Project image <span className="font-normal text-text-tertiary">- optional</span>
            </label>

            <div className="flex items-center gap-4 rounded-[12px] border border-border-subtle bg-white px-4 py-4">
              <div className="shrink-0">
                <Avatar
                  name={draft.projectName.trim() || "Project"}
                  src={draft.projectImage ?? undefined}
                  size="lg"
                  variant="project"
                  className="border border-border-subtle"
                />
              </div>

              <div className="min-w-0 space-y-1">
                <button
                  type="button"
                  onClick={() => draftState.projectImageInputRef.current?.click()}
                  className="block cursor-pointer bg-transparent p-0 text-left text-[13px] text-text-secondary transition-colors hover:text-accent"
                >
                  {draft.projectImage ? "Replace photo" : "Upload photo"}
                </button>
                <button
                  type="button"
                  onClick={() => draftState.setProjectImage(null)}
                  disabled={!draft.projectImage}
                  className="block cursor-pointer bg-transparent p-0 text-left text-[13px] text-text-secondary transition-colors hover:text-destructive disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Remove
                </button>
              </div>
            </div>

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
        </OnboardingStepMotion>
      );
    case "client":
      return (
        <OnboardingStepMotion motionKey="client">
          <h3 className="mb-2 text-center font-heading text-[24px] font-semibold tracking-[-0.4px] text-text-primary">
            Client details
          </h3>
          <p className="mb-8 text-center text-[15px] leading-normal text-text-secondary">
            Who is this project for?
          </p>

          <div className="mb-4">
            <label className="mb-1.5 block text-[13px] font-medium text-text-primary">
              Client
            </label>
            <select
              value={
                draft.clientMode === "existing"
                  ? draft.selectedExistingClientName
                  : "__new__"
              }
              onChange={(event) => {
                const nextValue = event.target.value;
                if (nextValue === "__new__") {
                  draftState.setClientMode("new");
                  return;
                }

                const client = existingClients.find((item) => item.name === nextValue);
                if (!client) {
                  draftState.setClientMode("new");
                  return;
                }

                draftState.selectExistingClient(client);
              }}
              className="w-full rounded-[10px] border border-transparent bg-input-bg px-4 py-3 text-[15px] text-text-primary outline-none transition-all duration-200 focus:border-border focus:bg-white"
            >
              <option value="__new__">Create a new client</option>
              {existingClients.map((client) => (
                <option key={client.id} value={client.name}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>

          {draft.clientMode === "existing" && selectedClient ? (
            <div className="mb-4 flex items-center gap-3 rounded-[12px] border border-border-subtle bg-bg-subtle px-3 py-3">
              <Avatar
                name={selectedClient.name}
                src={selectedClient.avatarUrl}
                size="md"
                className="border border-border-subtle"
              />
              <div className="min-w-0">
                <p className="truncate text-[14px] font-medium text-text-primary">
                  {selectedClient.name}
                </p>
                <p className="text-[12px] text-text-secondary">
                  {selectedClient.projectCount} project{selectedClient.projectCount === 1 ? "" : "s"}
                </p>
              </div>
            </div>
          ) : (
            <div className="mb-4">
              <label className="mb-1.5 block text-[13px] font-medium text-text-primary">
                Client name
              </label>
              <input
                type="text"
                value={draft.clientMode === "new" ? draft.clientName : ""}
                onChange={(event) => draftState.setClientName(event.target.value)}
                placeholder="Acme Studio"
                className="w-full rounded-[10px] border border-transparent bg-input-bg px-4 py-3 text-[15px] text-text-primary outline-none transition-all duration-200 placeholder:text-text-tertiary focus:border-border focus:bg-white"
              />
            </div>
          )}

          <div className="mb-4">
            <label className="mb-1.5 block text-[13px] font-medium text-text-primary">
              Client email <span className="font-normal text-text-tertiary">- required</span>
            </label>
            <input
              type="email"
              value={draft.clientEmail}
              onChange={(event) => draftState.setClientEmail(event.target.value)}
              placeholder="client@example.com"
              className="w-full rounded-[10px] border border-transparent bg-input-bg px-4 py-3 text-[15px] text-text-primary outline-none transition-all duration-200 placeholder:text-text-tertiary focus:border-border focus:bg-white"
            />
          </div>

          <div className="mb-6">
            <label className="mb-1.5 block text-[13px] font-medium text-text-primary">
              Client photo <span className="font-normal text-text-tertiary">- required</span>
            </label>

            <div className="flex items-center gap-4 rounded-[12px] border border-border-subtle bg-white px-4 py-4">
              <div className="shrink-0">
                <Avatar
                  name={
                    draft.clientMode === "existing"
                      ? draft.selectedExistingClientName || draft.clientName
                      : draft.clientName || "Client"
                  }
                  src={draft.clientAvatar ?? undefined}
                  size="lg"
                  className="border border-border-subtle"
                />
              </div>

              <div className="min-w-0 space-y-1">
                <button
                  type="button"
                  onClick={() => draftState.fileInputRef.current?.click()}
                  className="block cursor-pointer bg-transparent p-0 text-left text-[13px] text-text-secondary transition-colors hover:text-accent"
                >
                  {draft.clientAvatar ? "Replace photo" : "Upload photo"}
                </button>
                <button
                  type="button"
                  onClick={() => draftState.setClientAvatar(null)}
                  disabled={!draft.clientAvatar}
                  className="block cursor-pointer bg-transparent p-0 text-left text-[13px] text-text-secondary transition-colors hover:text-destructive disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Remove
                </button>
              </div>
            </div>

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
        </OnboardingStepMotion>
      );
    case "project-type":
      return (
        <OnboardingStepMotion motionKey="project-type">
          <h3 className="font-heading text-[24px] leading-[1.15] font-semibold tracking-[-0.4px] text-text-primary">
            What is the primary project type?
          </h3>
          <p className="mt-2 text-[15px] leading-normal text-text-secondary">
            Pick the closest match for the roadmap. You can still work across multiple disciplines.
          </p>

          <div className="mt-7 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {PROJECT_TYPES.map((typeOption) => (
              <button
                key={typeOption.value}
                type="button"
                onClick={() => draftState.setProjectType(typeOption.value)}
                className={cn(
                  "cursor-pointer rounded-[10px] border-[1.5px] px-4 py-3 text-center text-[14px] font-medium transition-all duration-150 focus:outline-none",
                  draft.projectType === typeOption.value
                    ? "border-accent bg-[rgba(135,130,245,0.08)] text-accent"
                    : "border-transparent bg-input-bg text-text-primary hover:bg-[#EFEFEF]",
                )}
              >
                {typeOption.label}
              </button>
            ))}
          </div>
        </OnboardingStepMotion>
      );
    case "method":
      return (
        <OnboardingStepMotion motionKey="method">
          <h3 className="font-heading text-[24px] leading-[1.15] font-semibold tracking-[-0.4px] text-text-primary">
            Build your roadmap
          </h3>
          <p className="mt-2 text-[15px] leading-normal text-text-secondary">
            How do you want to structure this project?
          </p>

          <div className="mt-7 flex flex-col gap-2.5">
            <OptionCard
              active={draft.method === "ai"}
              title="AI-Generated"
              description="Tailored phases and tasks based on your project type."
              onClick={() => draftState.setMethod("ai")}
            />
            <OptionCard
              active={draft.method === "manual"}
              title="Manual Setup"
              description="Choose your own phases and add tasks as you go."
              onClick={() => draftState.setMethod("manual")}
            />
          </div>
        </OnboardingStepMotion>
      );
    case "phase-select":
      return (
        <OnboardingStepMotion motionKey="phase-select">
          <h3 className="font-heading text-[24px] leading-[1.15] font-semibold tracking-[-0.4px] text-text-primary">
            Select phases
          </h3>
          <p className="mt-2 text-[15px] leading-normal text-text-secondary">
            Rename, remove, toggle, or reorder the phases you want.
          </p>

          <div className="mt-6">
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
            onClick={draftState.addPhase}
            className="mt-2 inline-flex cursor-pointer items-center gap-1 text-[13px] font-medium text-accent transition-colors hover:text-accent-hover"
          >
            + Add phase
          </button>
        </OnboardingStepMotion>
      );
    case "timeline":
      return (
        <OnboardingStepMotion motionKey="timeline">
          <h3 className="font-heading text-[24px] leading-[1.15] font-semibold tracking-[-0.4px] text-text-primary">
            Project timeline
          </h3>
          <p className="mt-2 text-[15px] leading-normal text-text-secondary">
            When does this project start and end?
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <div className="flex-1">
              <label className="mb-1.5 block text-[13px] font-medium text-text-primary">
                Start date
              </label>
              <input
                type="date"
                value={draft.startDate}
                onChange={(event) => draftState.setStartDate(event.target.value)}
                className="w-full rounded-[10px] border border-transparent bg-input-bg px-[14px] py-3 text-[14px] text-text-primary outline-none transition-all duration-200 focus:border-border focus:bg-white"
              />
            </div>

            <div className="flex-1">
              <label className="mb-1.5 block text-[13px] font-medium text-text-primary">
                End date
              </label>
              <input
                type="date"
                value={draft.endDate}
                onChange={(event) => draftState.setEndDate(event.target.value)}
                className="w-full rounded-[10px] border border-transparent bg-input-bg px-[14px] py-3 text-[14px] text-text-primary outline-none transition-all duration-200 focus:border-border focus:bg-white"
              />
            </div>
          </div>
        </OnboardingStepMotion>
      );
    case "preview":
      return (
        <OnboardingStepMotion motionKey="preview">
          <h3 className="font-heading text-[24px] leading-[1.15] font-semibold tracking-[-0.4px] text-text-primary">
            Your roadmap
          </h3>
          <p className="mt-2 text-[15px] leading-normal text-text-secondary">
            Looking good. You can adjust everything later.
          </p>

          <div className="mt-7">
            {previewRoadmap.map((phase, index) => (
              <div key={`${phase.name}-${index}`} className="flex items-center gap-3.5">
                <div className="flex w-[18px] shrink-0 flex-col items-center">
                  <span className="h-2.5 w-2.5 rounded-full bg-accent" />
                  {index < previewRoadmap.length - 1 ? <span className="h-7 w-px bg-border" /> : null}
                </div>
                <div className="flex flex-1 items-center justify-between py-2">
                  <span className="text-[14px] font-medium text-text-primary">{phase.name}</span>
                  <span className="text-[13px] text-text-secondary">
                    {phase.tasks.length > 0 ? `${phase.tasks.length} tasks` : "0 tasks"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </OnboardingStepMotion>
      );
    case "generating-roadmap":
      return (
        <OnboardingStepMotion
          motionKey="generating-roadmap"
          className="flex min-h-[220px] flex-col items-center justify-center text-center sm:min-h-[300px]"
        >
          <LoadingStage
            title="AI is generating your roadmap..."
            subtitle="We are shaping the phases and tasks for your project."
          />
        </OnboardingStepMotion>
      );
    case "integrations":
      return (
        <OnboardingStepMotion motionKey="integrations">
          <StaticOnboardingImage src={integrationsImage} alt="Integrations preview" />

          <div className="mt-6 border-t border-border-subtle pt-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2.5">
                  <img src="/claude.svg" alt="Claude" className="h-4 w-4" />
                  <p className="text-[15px] font-medium text-text-primary">Claude</p>
                  <span className="rounded-full bg-bg-subtle px-2 py-0.5 text-[11px] font-medium text-text-secondary">
                    {claudeConnection?.status === "connected" && claudeConnection.stageApiVerified
                      ? "Connected"
                      : claudeConnection?.status === "error"
                        ? "Needs attention"
                        : "Not connected"}
                  </span>
                </div>
                <p className="mt-2 max-w-[520px] text-[13px] leading-[1.45] text-text-secondary">
                  Connect Claude now, or do it later in Settings. Stage will use Claude as the
                  main workflow layer for research, strategy, and generation.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <a
                  href={claudeSetupHref}
                  className="inline-flex h-[42px] items-center justify-center rounded-[10px] bg-text-primary px-4 text-[14px] font-medium text-white transition-opacity hover:opacity-90"
                >
                  Continue with Claude
                </a>
                <button
                  type="button"
                  onClick={() => void navigator.clipboard.writeText(claudeInstallCommand)}
                  className="inline-flex h-[42px] items-center justify-center rounded-[10px] border border-border px-4 text-[14px] font-medium text-text-primary transition-colors hover:bg-bg-subtle"
                >
                  Copy code
                </button>
              </div>
            </div>

            <div className="mt-3 text-[12px] text-text-secondary">
              Install: <span className="font-mono text-text-primary">{claudeInstallCommand}</span>
            </div>
          </div>

          <div className="mt-6 border-t border-border-subtle pt-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2.5">
                  <img
                    src={GOOGLE_SHEETS_ICON_SRC}
                    alt="Google Sheets"
                    className="h-4 w-4"
                  />
                  <p className="text-[15px] font-medium text-text-primary">Google Sheets import</p>
                </div>
                <GuideLink
                  href={googleSheetsGuideHref}
                  openInNewTab
                  className="mt-1 text-[13px] font-medium text-accent underline decoration-[rgba(135,130,245,0.35)] underline-offset-4 hover:text-accent-hover hover:decoration-[rgba(118,112,224,0.55)]"
                >
                  View import guide
                </GuideLink>
              </div>

              <button
                type="button"
                onClick={onToggleCsvConnection}
                className="cursor-pointer text-[14px] font-medium text-accent transition-colors hover:text-accent-hover focus:outline-none"
              >
                {csvConnected ? "Unlink" : "Link Google Sheets"}
              </button>
            </div>

            {csvConnected ? (
              <>
                <div className="mt-3 flex flex-col gap-2 md:flex-row">
                  <input
                    value={sheetUrl}
                    onChange={(event) => onSheetUrlChange(event.target.value)}
                    placeholder="Paste your Google Sheets link"
                    className="h-[44px] flex-1 rounded-[10px] border border-transparent bg-input-bg px-3.5 text-[14px] text-text-primary transition-all duration-200 outline-none placeholder:text-text-tertiary focus:border-border focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={onLinkSheetUrl}
                    disabled={!sheetUrl.trim() || csvImporting}
                    className="h-[44px] w-full cursor-pointer rounded-[10px] bg-text-primary px-4 text-[14px] font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-default disabled:opacity-45 focus:outline-none md:min-w-[220px] md:w-auto"
                  >
                    {csvImporting ? "Linking..." : "Link Google Sheets"}
                  </button>
                </div>
                {csvImported ? (
                  <div className="mt-2 text-[12px] text-accent">
                    Imported. We&apos;ll use this data in your dashboard.
                  </div>
                ) : null}
              </>
            ) : (
              <p className="mt-3 max-w-[520px] text-[13px] leading-[1.45] text-text-secondary">
                Optional for now. Copy our{" "}
                <a
                  href={GOOGLE_SHEETS_TEMPLATE_HREF}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="font-medium text-accent underline decoration-[rgba(135,130,245,0.35)] underline-offset-4 hover:text-accent-hover hover:decoration-[rgba(118,112,224,0.55)]"
                >
                  Stage template
                </a>
                , fill in your invoices and expenses, then click{" "}
                <span className="font-medium text-text-primary">Link Google Sheets</span> to connect
                it. The template has everything set up for you.
              </p>
            )}
          </div>

          <div className="mt-4 border-t border-border-subtle pt-5">
            <div className="flex items-start gap-2.5">
              <img src={STRIPE_ICON_SRC} alt="Stripe" className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="text-[15px] font-medium text-text-primary">Stripe</p>
                <p className="mt-1 text-[13px] leading-[1.45] text-text-secondary">
                  Stripe will be ready right after onboarding, so you can connect payouts and payment
                  tracking next.
                </p>
              </div>
            </div>
          </div>
        </OnboardingStepMotion>
      );
    case "creating":
      return (
        <OnboardingStepMotion
          motionKey="creating"
          className="flex min-h-[220px] flex-col items-center justify-center text-center sm:min-h-[300px]"
        >
          <CreatingDashboardText
            userName={userName}
            isReady={creationReady}
            onDone={onCreationDone}
          />
        </OnboardingStepMotion>
      );
    case "paywall":
      return (
        <OnboardingStepMotion motionKey="paywall">
          <OnboardingPaywall
            onContinueFree={onContinueFree}
            onUpgrade={(billingCycle) => onUpgrade(billingCycle)}
            isUpgradeLoading={isCheckoutLoading}
            upgradeError={checkoutError}
          />
        </OnboardingStepMotion>
      );
    default:
      return null;
  }
}
