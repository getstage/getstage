import {
  ArrowRight,
  CalendarBlank,
  Check,
  CopySimple,
  DotsSixVertical,
  Package,
  PencilSimpleLine,
  Plus,
  Trash,
} from "@phosphor-icons/react";
import { useState } from "react";
import { OnboardingPaywall } from "@/components/onboarding/OnboardingPaywall";
import { Avatar } from "@/components/ui/Avatar";
import stageLogo from "@/assets/logos/stage-logo-light.png";
import timelineOverviewImage from "@/assets/landing-images/timeline-overview.webp";
import { PROJECT_TYPES, PROJECT_TYPE_ICONS } from "@/lib/constants";
import { AVATAR_ACCEPT, PROJECT_MARKER_ACCEPT } from "@/lib/r2Uploads";
import { cn } from "@/lib/utils";
import type { UseProjectDraftResult } from "@/features/project-creation/useProjectDraft";
import type { OnboardingStepId } from "@/features/onboarding/model";
import type { ProjectType } from "@/types";
import type { ClaudeConnectionSummary } from "@/types/settings";
import { CreatingDashboardText, LoadingStage, WelcomeSlide } from "./OnboardingAnimations";
import { GuideLink, OnboardingStepMotion, StepShell } from "./OnboardingPrimitives";

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
  claudeConnectionId: string | null;
  onSheetUrlChange: (value: string) => void;
  onToggleCsvConnection: () => void;
  onLinkSheetUrl: () => void;
  onCreationDone: () => void;
  onContinueFree: () => void;
  onUpgrade: (billingCycle: "monthly" | "yearly") => void;
  onClaudeActivated: () => void;
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
  claudeConnectionId,
  onSheetUrlChange,
  onToggleCsvConnection,
  onLinkSheetUrl,
  onCreationDone,
  onContinueFree,
  onUpgrade,
  onClaudeActivated,
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
                    ) : option.value === "packaging" ? (
                      <Package size={16} weight="regular" className="shrink-0" />
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
          <ClaudeOnboardingStep
            claudeConnection={claudeConnection}
            claudeSetupHref={claudeSetupHref}
            claudeInstallCommand={claudeInstallCommand}
            claudeConnectionId={claudeConnectionId}
            onActivate={onClaudeActivated}
          />
        </OnboardingStepMotion>
      );
    case "details":
      return (
        <OnboardingStepMotion motionKey="details">
          <div className="space-y-3">
            <StepShell label="Project Basics">
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-text-primary">
                    Project name
                  </label>
                  <input
                    type="text"
                    value={draft.projectName}
                    onChange={(event) => draftState.setProjectName(event.target.value)}
                    placeholder="Baseframe"
                    autoFocus
                    className="w-full rounded-[6px] border border-transparent bg-[#F5F5F5] px-3 py-2.5 text-[13px] font-medium text-text-primary shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] outline-none transition-all duration-200 placeholder:text-text-tertiary focus:border-border focus:bg-white"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-text-primary">
                    Cover <span className="font-normal text-text-tertiary">(Optional)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => draftState.projectImageInputRef.current?.click()}
                    className="flex w-full cursor-pointer items-center gap-3 rounded-[6px] bg-[#F5F5F5] px-3 py-2.5 text-left shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#EFEFEF]"
                  >
                    <div className="shrink-0">
                      <Avatar
                        name={draft.projectName.trim() || "Project"}
                        src={draft.projectImage ?? undefined}
                        size="md"
                        variant="project"
                      />
                    </div>
                    <span className="text-[13px] font-medium text-text-secondary">
                      {draft.projectImage ? "Replace document" : "Upload Document"}
                    </span>
                  </button>
                  {draft.projectImage ? (
                    <button
                      type="button"
                      onClick={() => draftState.setProjectImage(null)}
                      className="mt-2 cursor-pointer bg-transparent p-0 text-[12px] text-text-secondary transition-colors hover:text-destructive"
                    >
                      Remove document
                    </button>
                  ) : null}
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
            </StepShell>

            <StepShell label="Client Details">
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-text-primary">
                    Who is this for?
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
                    className="w-full rounded-[6px] border border-transparent bg-[#F5F5F5] px-3 py-2.5 text-[13px] font-medium text-text-secondary shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] outline-none transition-all duration-200 focus:border-border focus:bg-white"
                  >
                    <option value="__new__">Select Client</option>
                    {existingClients.map((client) => (
                      <option key={client.id} value={client.name}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </div>

                {draft.clientMode === "existing" && selectedClient ? (
                  <div className="flex items-center gap-3 rounded-[6px] bg-[#F5F5F5] px-3 py-2.5 shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
                    <Avatar name={selectedClient.name} src={selectedClient.avatarUrl} size="md" />
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium text-text-primary">
                        {selectedClient.name}
                      </p>
                      <p className="text-[12px] text-text-secondary">
                        {selectedClient.projectCount} project{selectedClient.projectCount === 1 ? "" : "s"}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="mb-1.5 block text-[13px] font-medium text-text-primary">
                      Client Name
                    </label>
                    <input
                      type="text"
                      value={draft.clientMode === "new" ? draft.clientName : ""}
                      onChange={(event) => draftState.setClientName(event.target.value)}
                      placeholder="Baseframe"
                      className="w-full rounded-[6px] border border-transparent bg-[#F5F5F5] px-3 py-2.5 text-[13px] font-medium text-text-primary shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] outline-none transition-all duration-200 placeholder:text-text-tertiary focus:border-border focus:bg-white"
                    />
                  </div>
                )}

                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-text-primary">
                    Client email <span className="font-normal text-text-tertiary">(Optional)</span>
                  </label>
                  <input
                    type="email"
                    value={draft.clientEmail}
                    onChange={(event) => draftState.setClientEmail(event.target.value)}
                    placeholder="client@example.com"
                    className="w-full rounded-[6px] border border-transparent bg-[#F5F5F5] px-3 py-2.5 text-[13px] font-medium text-text-primary shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] outline-none transition-all duration-200 placeholder:text-text-tertiary focus:border-border focus:bg-white"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-text-primary">
                    Photo <span className="font-normal text-text-tertiary">(Optional)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => draftState.fileInputRef.current?.click()}
                    className="flex w-full cursor-pointer items-center gap-3 rounded-[6px] bg-[#F5F5F5] px-3 py-2.5 text-left shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#EFEFEF]"
                  >
                    <Avatar
                      name={
                        draft.clientMode === "existing"
                          ? draft.selectedExistingClientName || draft.clientName
                          : draft.clientName || "Client"
                      }
                      src={draft.clientAvatar ?? undefined}
                      size="md"
                    />
                    <span className="text-[13px] font-medium text-text-secondary">
                      {draft.clientAvatar ? "Replace photo" : "Upload Photo"}
                    </span>
                  </button>
                  {draft.clientAvatar ? (
                    <button
                      type="button"
                      onClick={() => draftState.setClientAvatar(null)}
                      className="mt-2 cursor-pointer bg-transparent p-0 text-[12px] text-text-secondary transition-colors hover:text-destructive"
                    >
                      Remove photo
                    </button>
                  ) : null}
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
            </StepShell>
          </div>
        </OnboardingStepMotion>
      );
    case "client":
      return (
        <OnboardingStepMotion motionKey="client">
          <StepShell label="Client Details">
            <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-text-primary">
              Who is this for?
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
            <div className="flex items-center gap-3 rounded-[10px] bg-[#F5F5F7] px-3 py-3">
              <Avatar
                name={selectedClient.name}
                src={selectedClient.avatarUrl}
                size="md"
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
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-text-primary">
                Client Name
              </label>
              <input
                type="text"
                value={draft.clientMode === "new" ? draft.clientName : ""}
                onChange={(event) => draftState.setClientName(event.target.value)}
                placeholder="Baseframe"
                className="w-full rounded-[10px] border border-transparent bg-[#F5F5F7] px-4 py-3 text-[15px] text-text-primary outline-none transition-all duration-200 placeholder:text-text-tertiary focus:border-border focus:bg-white"
              />
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-text-primary">
              Client email <span className="font-normal text-text-tertiary">(Optional)</span>
            </label>
            <input
              type="email"
              value={draft.clientEmail}
              onChange={(event) => draftState.setClientEmail(event.target.value)}
              placeholder="client@example.com"
              className="w-full rounded-[10px] border border-transparent bg-[#F5F5F7] px-4 py-3 text-[15px] text-text-primary outline-none transition-all duration-200 placeholder:text-text-tertiary focus:border-border focus:bg-white"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-text-primary">
              Photo <span className="font-normal text-text-tertiary">(Optional)</span>
            </label>

            <div className="flex items-center gap-4 rounded-[10px] bg-[#F5F5F7] px-4 py-3">
              <div className="shrink-0">
                <Avatar
                  name={
                    draft.clientMode === "existing"
                      ? draft.selectedExistingClientName || draft.clientName
                      : draft.clientName || "Client"
                  }
                  src={draft.clientAvatar ?? undefined}
                  size="md"
                />
              </div>
              <div className="min-w-0 flex-1 space-x-3 text-[13px]">
                <button
                  type="button"
                  onClick={() => draftState.fileInputRef.current?.click()}
                  className="cursor-pointer bg-transparent p-0 text-text-secondary transition-colors hover:text-accent"
                >
                  {draft.clientAvatar ? "Replace photo" : "Upload Photo"}
                </button>
                {draft.clientAvatar ? (
                  <button
                    type="button"
                    onClick={() => draftState.setClientAvatar(null)}
                    className="cursor-pointer bg-transparent p-0 text-text-secondary transition-colors hover:text-destructive"
                  >
                    Remove
                  </button>
                ) : null}
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
            </div>
          </StepShell>
        </OnboardingStepMotion>
      );
    case "project-type":
      return (
        <OnboardingStepMotion motionKey="project-type">
          <StepShell label="Project Type">
            <div className="grid grid-cols-2 gap-2">
              {PROJECT_TYPES.map((typeOption) => {
                const iconSrc = PROJECT_TYPE_ICONS[typeOption.value];
                const isSelected = draft.projectType === typeOption.value;
                return (
                  <button
                    key={typeOption.value}
                    type="button"
                    onClick={() => draftState.setProjectType(typeOption.value)}
                    className={cn(
                      "flex cursor-pointer items-center justify-center gap-2 rounded-[10px] border-[1.5px] bg-[#F5F5F7] px-4 py-6 text-center text-[14px] font-medium transition-all duration-150 focus:outline-none",
                      isSelected
                        ? "border-accent bg-[rgba(135,130,245,0.08)] text-accent"
                        : "border-transparent text-text-primary hover:bg-[#EFEFEF]",
                    )}
                  >
                    {iconSrc ? (
                      <img src={iconSrc} alt="" className="h-4 w-4 shrink-0 object-contain" />
                    ) : typeOption.value === "packaging" ? (
                      <Package size={16} weight="regular" className="shrink-0" />
                    ) : null}
                    <span>{typeOption.label}</span>
                  </button>
                );
              })}
            </div>
          </StepShell>
        </OnboardingStepMotion>
      );
    case "method": {
      const activePhases = draft.phases.filter((phase) => phase.on);
      const roadmapItems =
        draft.method === "ai"
          ? previewRoadmap.map((phase) => ({ id: phase.name, name: phase.name }))
          : activePhases;
      return (
        <OnboardingStepMotion motionKey="method">
          <StepShell label="How do you want to structure this project?">
            <div className="space-y-2">
              <div className="rounded-[8px] bg-white p-3 shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
                <button
                  type="button"
                  onClick={() => draftState.setMethod("ai")}
                  className="flex w-full cursor-pointer items-center gap-3 rounded-[6px] bg-transparent px-1 py-2 text-left transition-colors hover:bg-[#F5F5F5] focus:outline-none"
                >
                  <span
                    className={cn(
                      "grid h-5 w-5 shrink-0 place-items-center rounded-full",
                      draft.method === "ai" ? "bg-[#171717]" : "bg-[#E5E5E5]",
                    )}
                  >
                    {draft.method === "ai" ? (
                      <span className="h-2 w-2 rounded-full bg-white" />
                    ) : null}
                  </span>
                  <span className="text-[15px] font-medium text-text-primary">Smart Setup</span>
                </button>
                <button
                  type="button"
                  onClick={() => draftState.setMethod("manual")}
                  className="flex w-full cursor-pointer items-center gap-3 rounded-[6px] bg-transparent px-1 py-2 text-left transition-colors hover:bg-[#F5F5F5] focus:outline-none"
                >
                  <span
                    className={cn(
                      "grid h-5 w-5 shrink-0 place-items-center rounded-full",
                      draft.method === "manual" ? "bg-[#171717]" : "bg-[#E5E5E5]",
                    )}
                  >
                    {draft.method === "manual" ? (
                      <span className="h-2 w-2 rounded-full bg-white" />
                    ) : null}
                  </span>
                  <span className="text-[15px] font-medium text-text-primary">Manual Setup</span>
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
                          "flex items-center gap-3 py-2.5",
                          index < draft.phases.length - 1 ? "border-b border-[#EFEFF2]" : "",
                        )}
                      >
                        <DotsSixVertical size={15} className="shrink-0 text-text-tertiary" />
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
                            className="h-8 flex-1 rounded-[6px] border border-border bg-[#F5F5F5] px-2.5 text-[13px] text-text-primary outline-none"
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={() => draftState.setEditingPhaseId(phase.id)}
                            className={cn(
                              "flex-1 cursor-pointer text-left text-[13px] font-medium",
                              phase.on ? "text-text-primary" : "text-text-tertiary",
                            )}
                          >
                            {phase.name}
                          </button>
                        )}
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
                        <button
                          type="button"
                          onClick={() => draftState.removePhase(phase.id)}
                          disabled={draft.phases.length <= 1}
                          className="cursor-pointer text-text-tertiary transition-colors hover:text-destructive disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label={`Remove ${phase.name}`}
                        >
                          <Trash size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={draftState.addPhase}
                    className="mt-3 inline-flex h-9 w-full cursor-pointer items-center justify-center gap-1 rounded-[6px] bg-[#F5F5F5] text-[13px] font-medium text-text-primary transition-colors hover:bg-[#EFEFEF]"
                  >
                    <Plus size={14} />
                    Add Phase
                  </button>
                </div>
              ) : draft.method === "ai" && roadmapItems.length > 0 ? (
                <div className="rounded-[8px] bg-white p-4 shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
                  <div className="relative py-1 pl-1">
                  <span
                    aria-hidden
                    className="absolute bottom-[18px] left-[10px] top-[18px] w-px rounded-full bg-[#A3A3A3]"
                  />
                    <ul className="space-y-4">
                      {roadmapItems.map((phase) => (
                      <li key={phase.id} className="relative flex items-center gap-3">
                        <span className="relative z-10 grid h-5 w-5 shrink-0 place-items-center rounded-full border-[4px] border-[#2F2B7F] bg-white">
                          <span className="h-1.5 w-1.5 rounded-full bg-white" />
                        </span>
                        <span className="text-[15px] font-medium text-text-primary">
                          {phase.name}
                        </span>
                      </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : null}
            </div>
          </StepShell>
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
              onClick={draftState.addPhase}
              className="mt-2 inline-flex cursor-pointer items-center gap-1 text-[13px] font-medium text-accent transition-colors hover:text-accent-hover"
            >
              + Add phase
            </button>
          </StepShell>
        </OnboardingStepMotion>
      );
    case "timeline":
      return (
        <OnboardingStepMotion motionKey="timeline">
          <StepShell label="Timeline">
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex-1">
                <label className="mb-2 block text-[13px] font-semibold text-text-primary">
                  Start
                </label>
                <div className="flex items-center gap-3 rounded-[6px] bg-[#F5F5F5] px-3 py-2.5 shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
                  <CalendarBlank size={16} className="shrink-0 text-text-secondary" />
                  <input
                    type="date"
                    value={draft.startDate}
                    onChange={(event) => draftState.setStartDate(event.target.value)}
                    className="min-w-0 flex-1 bg-transparent text-[13px] font-medium text-text-secondary outline-none"
                  />
                </div>
              </div>

              <div className="flex-1">
                <label className="mb-2 block text-[13px] font-semibold text-text-primary">
                  End
                </label>
                <div className="flex items-center gap-3 rounded-[6px] bg-[#F5F5F5] px-3 py-2.5 shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
                  <CalendarBlank size={16} className="shrink-0 text-text-secondary" />
                  <input
                    type="date"
                    value={draft.endDate}
                    onChange={(event) => draftState.setEndDate(event.target.value)}
                    className="min-w-0 flex-1 bg-transparent text-[13px] font-medium text-text-secondary outline-none"
                  />
                </div>
              </div>
            </div>
          </StepShell>
        </OnboardingStepMotion>
      );
    case "preview":
      return (
        <OnboardingStepMotion motionKey="preview">
          <AlmostSetupPreview />
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
          <div className="space-y-3">
            <StepShell label="Select your AI model">
              <ul className="divide-y divide-[#EFEFF2]">
                <li className="flex items-center gap-3 py-3">
                  <img
                    src="/logos/integrations/codex.svg"
                    alt=""
                    className="h-5 w-5 shrink-0 object-contain"
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                  />
                  <span className="min-w-0 flex-1 text-[15px] font-medium text-text-primary">
                    Codex
                  </span>
                  <button
                    type="button"
                    className="rounded-[6px] bg-[#F5F5F5] px-3 py-1.5 text-[12px] font-medium text-text-secondary shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#EFEFEF]"
                  >
                    Connect Codex
                  </button>
                </li>
                <li className="flex items-center gap-3 py-3">
                  <img
                    src="/logos/integrations/claude.svg"
                    alt=""
                    className="h-5 w-5 shrink-0 object-contain"
                  />
                  <span className="min-w-0 flex-1 text-[15px] font-medium text-text-primary">
                    Claude
                  </span>
                  <button
                    type="button"
                    className="rounded-[6px] bg-[#F5F5F5] px-3 py-1.5 text-[12px] font-medium text-text-secondary shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#EFEFEF]"
                  >
                    {claudeConnection?.status === "connected" && claudeConnection.stageApiVerified
                      ? "Connected"
                      : "Connect Claude"}
                  </button>
                </li>
              </ul>
            </StepShell>

            <StepShell label="Select tools you want to integrate">
              <ul className="divide-y divide-[#EFEFF2]">
                <li className="flex items-center gap-3 py-3">
                  <img
                    src="/logos/integrations/figma.svg"
                    alt=""
                    className="h-5 w-5 shrink-0 object-contain"
                  />
                  <span className="min-w-0 flex-1 text-[15px] font-medium text-text-primary">
                    Figma
                  </span>
                  <button
                    type="button"
                    className="rounded-[6px] bg-[#F5F5F5] px-3 py-1.5 text-[12px] font-medium text-text-secondary shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#EFEFEF]"
                  >
                    Connect Figma
                  </button>
                </li>
                <li className="flex items-center gap-3 py-3">
                  <img
                    src="/logos/integrations/notion.svg"
                    alt=""
                    className="h-5 w-5 shrink-0 object-contain"
                  />
                  <span className="min-w-0 flex-1 text-[15px] font-medium text-text-primary">
                    Notion
                  </span>
                  <button
                    type="button"
                    className="rounded-[6px] bg-[#F5F5F5] px-3 py-1.5 text-[12px] font-medium text-text-secondary shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#EFEFEF]"
                  >
                    Connect Notion
                  </button>
                </li>
              </ul>
            </StepShell>

            <details className="rounded-[12px] bg-[#F5F5F7] px-4 py-3 text-[13px] text-text-secondary">
              <summary className="cursor-pointer text-[13px] font-medium text-text-primary">
                Advanced: Google Sheets &amp; Stripe
              </summary>
              <div className="mt-3 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5">
                      <img src={GOOGLE_SHEETS_ICON_SRC} alt="Google Sheets" className="h-4 w-4" />
                      <p className="text-[14px] font-medium text-text-primary">Google Sheets import</p>
                    </div>
                    <GuideLink
                      href={googleSheetsGuideHref}
                      openInNewTab
                      className="mt-1 text-[12px] font-medium text-accent underline decoration-[rgba(135,130,245,0.35)] underline-offset-4 hover:text-accent-hover hover:decoration-[rgba(118,112,224,0.55)]"
                    >
                      View import guide
                    </GuideLink>
                  </div>
                  <button
                    type="button"
                    onClick={onToggleCsvConnection}
                    className="cursor-pointer text-[13px] font-medium text-accent transition-colors hover:text-accent-hover focus:outline-none"
                  >
                    {csvConnected ? "Unlink" : "Link Google Sheets"}
                  </button>
                </div>
                {csvConnected ? (
                  <>
                    <div className="flex flex-col gap-2 md:flex-row">
                      <input
                        value={sheetUrl}
                        onChange={(event) => onSheetUrlChange(event.target.value)}
                        placeholder="Paste your Google Sheets link"
                        className="h-[40px] flex-1 rounded-[10px] border border-transparent bg-white px-3.5 text-[13px] text-text-primary transition-all outline-none placeholder:text-text-tertiary focus:border-border"
                      />
                      <button
                        type="button"
                        onClick={onLinkSheetUrl}
                        disabled={!sheetUrl.trim() || csvImporting}
                        className="h-[40px] cursor-pointer rounded-[10px] bg-accent px-4 text-[13px] font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-default disabled:opacity-45 focus:outline-none"
                      >
                        {csvImporting ? "Linking..." : "Link"}
                      </button>
                    </div>
                    {csvImported ? (
                      <div className="text-[12px] text-accent">
                        Imported. We&apos;ll use this data in your dashboard.
                      </div>
                    ) : null}
                  </>
                ) : (
                  <p className="text-[12px] leading-[1.45] text-text-secondary">
                    Optional. Copy our{" "}
                    <a
                      href={GOOGLE_SHEETS_TEMPLATE_HREF}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="font-medium text-accent underline decoration-[rgba(135,130,245,0.35)] underline-offset-4 hover:text-accent-hover"
                    >
                      Stage template
                    </a>
                    , fill in your invoices and expenses, then click Link Google Sheets.
                  </p>
                )}

                <div className="flex items-start gap-2.5 border-t border-[#EFEFF2] pt-3">
                  <img src={STRIPE_ICON_SRC} alt="Stripe" className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p className="text-[14px] font-medium text-text-primary">Stripe</p>
                    <p className="mt-1 text-[12px] leading-[1.45] text-text-secondary">
                      Stripe will be ready right after onboarding.
                    </p>
                  </div>
                </div>
              </div>
            </details>
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
    case "celebrating":
      return (
        <OnboardingStepMotion motionKey="celebrating">
          <ProSuccessCard />
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

function AlmostSetupPreview() {
  return (
    <div className="grid min-h-[360px] overflow-hidden rounded-[12px] bg-white shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] md:grid-cols-[0.42fr_0.58fr]">
      <div className="flex flex-col justify-center px-7 py-10">
        <h3 className="font-heading text-[24px] font-semibold leading-[1.15] tracking-[-0.4px] text-text-primary">
          You&apos;re almost setup.
        </h3>
        <p className="mt-3 text-[14px] font-medium leading-[1.5] text-text-secondary">
          Here&apos;s your workspace, set up and ready to go
        </p>
      </div>
      <div className="relative min-h-[280px] overflow-hidden bg-[#4B46C6]">
        <img
          src="/onboarding/almost-setup-gradient.png"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute left-[12%] top-[18%] w-[108%] overflow-hidden rounded-[12px] bg-white shadow-[0_24px_70px_rgba(20,20,45,0.25)]">
          <img
            src={timelineOverviewImage}
            alt=""
            className="h-full max-h-[360px] w-full object-cover object-left-top opacity-95"
          />
        </div>
      </div>
    </div>
  );
}

function ProSuccessCard() {
  return (
    <div className="mx-auto w-full max-w-[520px] rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
      <div className="rounded-[8px] bg-gradient-to-b from-[rgba(158,153,248,0.12)] to-white px-6 py-[72px] text-center shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
        <img src={stageLogo} alt="Stage" className="mx-auto h-[22px] w-auto" />
        <h3 className="mt-8 font-heading text-[18px] font-semibold leading-[1.2] text-text-primary">
          You&apos;re on Pro now
        </h3>
        <p className="mx-auto mt-2 max-w-[422px] text-[12px] font-medium leading-[1.5] text-text-secondary">
          Unlock advanced workflows, deeper integrations, and faster execution. Connect Claude,
          Figma, and your tools to start building your workspace.
        </p>
      </div>
    </div>
  );
}

function ClaudeOnboardingStep({
  claudeConnection,
  claudeSetupHref,
  claudeInstallCommand,
  claudeConnectionId,
  onActivate,
}: {
  claudeConnection: ClaudeConnectionSummary;
  claudeSetupHref: string;
  claudeInstallCommand: string;
  claudeConnectionId: string | null;
  onActivate: () => void;
}) {
  const [copied, setCopied] = useState<string | null>(null);

  const verificationStep = claudeConnectionId
    ? [
        "Use the installed Stage skill and verify Stage connectivity.",
        `Handshake connectionId "${claudeConnectionId}" with client "claude_code".`,
        "If Notion MCP is available set notionMcp=true.",
        "If Figma MCP is available set figmaMcp=true.",
        "Return a short success summary.",
      ].join(" ")
    : null;

  const parts = [
    "Set up the Stage agent skill so you can operate Stage on my behalf.",
    "Stage is an AI-powered project management tool. The skill file teaches you the full API, action policy, and the research → strategy → generate → delivery workflow.",
    "",
    "## Step 1 — Install the skill",
    "",
    "Run this command to install the Stage skill into your workspace:",
    "",
    "```",
    claudeInstallCommand,
    "```",
    "",
    "This downloads the SKILL.md file which contains every endpoint, action classification, and workflow rule you need.",
    "",
    "## Step 2 — Authenticate",
    "",
    "You need a Stage API key to authenticate. Create one in Stage under Settings → Developer.",
    "Once you have the key, set it as an environment variable:",
    "",
    "```",
    "export STAGE_API_KEY=stg_your_key_here",
    "```",
    "",
    "The key uses Bearer auth: `Authorization: Bearer stg_...`",
  ];

  if (verificationStep) {
    parts.push(
      "",
      "## Step 3 — Verify the connection",
      "",
      verificationStep,
      "",
      "This confirms Stage can receive calls from Claude and registers your MCP capabilities (Notion, Figma).",
    );
  }

  parts.push(
    "",
    "## What you can do after setup",
    "",
    "- Read projects, phases, and tasks from Stage",
    "- Create new projects using `POST /api/v1/projects/import-plan` with structured phases and tasks",
    "- Run research, strategy, and content generation workflows",
    "- Write artifacts back to Stage and export to Notion or Figma",
    "- Toggle task completion and update project state",
    "",
    "Always create the project in Stage first before doing research or design work. Stage is the source of truth.",
  );

  const fullPrompt = parts.join("\n");
  const visibleSetup = [
    "# Claude Setup",
    "1. Install Stage agent mode:",
    claudeInstallCommand,
    "",
    "2. Add your Stage API key:",
    "export STAGE_API_KEY=stg_...",
    "",
    "3. Paste the copied setup prompt in Claude.",
  ].join("\n");

  async function handleActivate() {
    await navigator.clipboard.writeText(fullPrompt);
    setCopied("full");
    window.setTimeout(() => {
      window.open("https://claude.ai/new", "_blank");
    }, 500);
    window.setTimeout(onActivate, 900);
    window.setTimeout(() => setCopied(null), 4000);
  }

  return (
    <div className="space-y-3">
      <div className="rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
        <div className="space-y-1">
          <div className="flex items-center justify-between rounded-[8px] bg-white p-3 shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
            <div className="flex items-center gap-2">
              <img src="/logos/integrations/claude.svg" alt="" className="h-4 w-4" />
              <span className="text-[13px] font-medium text-text-primary">Claude</span>
            </div>
            <span className="flex h-[18px] w-[30px] items-center justify-end rounded-full bg-[#DBD9FC] p-0.5">
              <span className="h-[14px] w-[14px] rounded-full bg-[#221E6C]" />
            </span>
          </div>

          <div className="rounded-[8px] bg-white p-3 shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
            <label className="mb-2 block text-[13px] font-medium text-text-primary">
              API Key
            </label>
            <div className="flex items-center justify-between gap-3 rounded-[6px] bg-[#F5F5F5] py-1 pl-3 pr-1 shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
              <span className="min-w-0 truncate text-[12px] font-medium text-text-secondary">
                *******************
              </span>
              <button
                type="button"
                onClick={() => window.open(claudeSetupHref, "_blank")}
                className="shrink-0 rounded-[6px] border border-[#525252] bg-gradient-to-b from-[#404040] to-[#0A0A0A] px-3 py-1 text-[12px] font-medium text-white shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]"
              >
                Generate Key
              </button>
            </div>
          </div>

          <div className="rounded-[8px] bg-white p-3 shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-[13px] font-medium text-text-primary">Auto-generated Setup</p>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(fullPrompt);
                  setCopied("prompt");
                  window.setTimeout(() => setCopied(null), 2500);
                }}
                className="inline-flex cursor-pointer items-center gap-1 text-[12px] font-medium text-text-tertiary transition-colors hover:text-text-primary"
              >
                {copied === "prompt" ? <Check size={12} weight="bold" /> : <CopySimple size={12} />}
                {copied === "prompt" ? "Copied" : "Copy full prompt"}
              </button>
            </div>
            <pre className="max-h-[172px] w-full overflow-auto whitespace-pre-wrap rounded-[6px] bg-[#F5F5F5] px-3 py-2.5 font-body text-[12px] font-medium leading-[1.5] text-text-secondary shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
              {visibleSetup}
            </pre>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => void handleActivate()}
        className="inline-flex h-[40px] w-full cursor-pointer items-center justify-center gap-2 rounded-[6px] border border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7B76DF] to-[#463FBA] px-5 text-[13px] font-medium text-white shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] transition-opacity hover:opacity-95 focus:outline-none"
      >
        {copied === "full" ? "Copied - opening Claude" : "Activate Claude"}
        <ArrowRight size={16} weight="bold" />
      </button>

      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "h-[7px] w-[7px] shrink-0 rounded-full",
              claudeConnection?.status === "connected" && claudeConnection.stageApiVerified
                ? "bg-success"
                : "bg-border",
            )}
          />
          <span className="text-[13px] text-text-secondary">
            {claudeConnection?.status === "connected" && claudeConnection.stageApiVerified
              ? "Connected"
              : "Not connected yet"}
          </span>
        </div>
        <a
          href={claudeSetupHref}
          className="text-[13px] font-medium text-accent transition-colors duration-150 hover:text-accent-hover"
        >
          Setup guide &rarr;
        </a>
      </div>
    </div>
  );
}
