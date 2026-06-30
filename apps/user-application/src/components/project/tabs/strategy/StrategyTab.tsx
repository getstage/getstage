import { useEffect, useMemo, useRef, useState } from "react";
import type { ProviderId } from "@stage/data-ops/contracts";
import { DownstreamStepsDialog } from "@/components/project/DownstreamStepsDialog";
import { StrategyRegenerateDialog } from "@/components/project/StrategyRegenerateDialog";
import { useAfterUpstreamRunPrompt } from "@/hooks/project/useAfterUpstreamRunPrompt";
import { useProjectDownstreamWork } from "@/hooks/project/useProjectDownstreamWork";
import { useProjectResearchRun } from "@/hooks/project/useProjectResearchRun";
import { useStrategyTab } from "@/hooks/project";
import { strategyInputToFormValues } from "@/lib/project/strategyGenerateInput";
import { useProjectAiProvider } from "@/hooks/project/useProjectAiProvider";
import { useExportStrategyToNotion } from "@/hooks/project/strategy/useExportStrategyToNotion";
import { useSaveStrategyArtifact } from "@/hooks/project/strategy/useSaveStrategyArtifact";
import { useStrategySectionRegenerate } from "@/hooks/project/strategy/useStrategySectionRegenerate";
import { applyStrategyTabEdits } from "@/lib/project/applyStrategyTabEdits";
import type { ValidatedStrategyGenerateInput } from "@/lib/project/strategyGenerateInput";
import { cn } from "@/lib/utils";
import { cloneSections } from "@/lib/project/strategyTabHelpers";
import type { Project } from "@/models/project/project";
import type { StrategySection } from "@/models/project/strategyTab";
import { NotionParentPageDialog } from "../research/NotionParentPageDialog";
import {
  AddSectionEditor,
} from "./AddSectionEditor";
import { StrategyGenerateStep } from "./StrategyGenerateStep";
import { StrategySectionCard } from "./StrategySectionCard";
import { MetaDot } from "./StrategyStatus";
import {
  ArrowRightIcon,
  EditIcon,
  NotionIcon,
  PlusIcon,
  SaveIcon,
} from "./strategyIcons";

// Matches the engine run source that regenerates only not-yet-approved sections,
// leaving approved sections untouched (apps/stage-engine/src/strategy/section.rs).
const REGENERATE_UNAPPROVED_SOURCE = "sections:unapproved";

type StrategyTabProps = {
  project: Pick<Project, "id" | "name" | "clientName">;
  onGoToResearch: () => void;
  onGoToMoodboard: () => void;
  autoStartGeneration?: boolean;
  pendingStrategyProviderId?: ProviderId | null;
  onAutoStartHandled?: () => void;
};

export function StrategyTab({
  project,
  onGoToResearch,
  onGoToMoodboard,
  autoStartGeneration = false,
  pendingStrategyProviderId = null,
  onAutoStartHandled,
}: StrategyTabProps) {
  const [sections, setSections] = useState<StrategySection[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editSections, setEditSections] = useState<StrategySection[]>([]);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [runError, setRunError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isRegenerateDialogOpen, setIsRegenerateDialogOpen] = useState(false);
  const [isFullStrategyRegenerating, setIsFullStrategyRegenerating] = useState(false);
  const latestSectionsRef = useRef<StrategySection[]>([]);
  const lastPersistedEmojiSectionsRef = useRef<StrategySection[]>([]);
  const emojiSaveQueueRef = useRef(Promise.resolve());
  const pendingEmojiSaveCountRef = useRef(0);
  const fullRegenerateSawBusyRef = useRef(false);

  const strategy = useStrategyTab(project);
  const researchRun = useProjectResearchRun(project.id);
  const downstreamWork = useProjectDownstreamWork(project.id);
  const upstreamPrompt = useAfterUpstreamRunPrompt(project.id);
  const isRunBusy = strategy.isRunning || strategy.isStarting;
  const saveStrategyArtifact = useSaveStrategyArtifact(project.id);
  const regenerateSection = useStrategySectionRegenerate(project.id);
  const regeneratingSectionId = regenerateSection.isRegenerating
    ? regenerateSection.activeSectionId
    : null;
  const {
    resolvedProviderId,
    providerOptions,
    selectedProviderId,
    selectProvider,
  } = useProjectAiProvider(project.id);
  const runProviderId = selectedProviderId ?? resolvedProviderId;
  const notionExport = useExportStrategyToNotion(strategy.data?.id ?? null);
  const visibleSections = isEditing ? editSections : sections;

  useEffect(() => {
    if (pendingEmojiSaveCountRef.current > 0) {
      return;
    }

    if (strategy.data) {
      const nextSections = cloneSections(strategy.data.tabData.sections);
      latestSectionsRef.current = nextSections;
      lastPersistedEmojiSectionsRef.current = cloneSections(nextSections);
      setSections(nextSections);
      return;
    }

    latestSectionsRef.current = [];
    lastPersistedEmojiSectionsRef.current = [];
    setSections([]);
    setIsEditing(false);
    setEditSections([]);
  }, [strategy.data]);

  useEffect(() => {
    if (!autoStartGeneration || !strategy.hasResearch || strategy.hasArtifact || strategy.isRunning) {
      return;
    }

    // Consume the one-shot flag before any async work so Strict Mode cannot start twice.
    onAutoStartHandled?.();
    void handleGenerateStrategy(undefined, pendingStrategyProviderId ?? undefined);
  }, [
    autoStartGeneration,
    onAutoStartHandled,
    pendingStrategyProviderId,
    strategy.hasArtifact,
    strategy.hasResearch,
    strategy.isRunning,
  ]);

  const approvedCount = useMemo(
    () => visibleSections.filter((section) => section.status === "approved").length,
    [visibleSections],
  );

  const { trackRunActivity, beginPending, ...downstreamPrompt } = upstreamPrompt;

  useEffect(() => {
    trackRunActivity(isRunBusy, runError ?? strategy.error);
  }, [isRunBusy, runError, strategy.error, trackRunActivity]);

  useEffect(() => {
    if (!isFullStrategyRegenerating) {
      fullRegenerateSawBusyRef.current = false;
      return;
    }

    if (isRunBusy) {
      fullRegenerateSawBusyRef.current = true;
      return;
    }

    if (fullRegenerateSawBusyRef.current || runError || strategy.error) {
      fullRegenerateSawBusyRef.current = false;
      setIsFullStrategyRegenerating(false);
    }
  }, [isFullStrategyRegenerating, isRunBusy, runError, strategy.error]);

  async function handleGenerateStrategy(
    input?: ValidatedStrategyGenerateInput,
    providerId?: ProviderId,
    options?: { isFullRegenerate?: boolean; regenerateUnapprovedOnly?: boolean },
  ) {
    setRunError(null);

    if (options?.isFullRegenerate) {
      fullRegenerateSawBusyRef.current = false;
      setIsFullStrategyRegenerating(true);
      beginPending("strategy", { hadDownstream: downstreamWork.hasDownstream });
    }

    try {
      await strategy.startStrategy(
        input,
        providerId,
        options?.regenerateUnapprovedOnly ? { source: REGENERATE_UNAPPROVED_SOURCE } : undefined,
      );
    } catch (error) {
      setRunError(error instanceof Error ? error.message : "Could not generate Strategy.");
      if (options?.isFullRegenerate) {
        fullRegenerateSawBusyRef.current = false;
        setIsFullStrategyRegenerating(false);
      }
    }
  }

  const regenerateFormInitialValues = useMemo(
    () => (strategy.lastInput ? strategyInputToFormValues(strategy.lastInput) : undefined),
    [strategy.lastInput],
  );

  async function persistSections(
    nextSections: StrategySection[],
    options?: { exitEditMode?: boolean; updateLocalState?: boolean },
  ) {
    if (!strategy.data) {
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const nextArtifact = applyStrategyTabEdits(strategy.data.artifact, {
        sections: cloneSections(nextSections),
      });
      await saveStrategyArtifact(strategy.data.id, nextArtifact);
      if (options?.updateLocalState !== false) {
        const localSections = cloneSections(nextSections);
        latestSectionsRef.current = localSections;
        setSections(localSections);
      }

      if (options?.exitEditMode) {
        setEditSections([]);
        setIsEditing(false);
      }
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Could not save strategy changes.");
      throw error;
    } finally {
      setIsSaving(false);
    }
  }

  async function approveSection(sectionId: string) {
    const nextSections = sections.map((section) =>
      section.id === sectionId ? { ...section, status: "approved" as const } : section,
    );

    try {
      await persistSections(nextSections);
    } catch {
      // saveError already set
    }
  }

  async function unapproveSection(sectionId: string) {
    const nextSections = sections.map((section) =>
      section.id === sectionId ? { ...section, status: "action" as const } : section,
    );

    try {
      await persistSections(nextSections);
    } catch {
      // saveError already set
    }
  }

  async function handleRegenerateSection(sectionId: string) {
    if (isEditing) {
      setSaveError("Save or discard changes before regenerating with AI.");
      return;
    }

    if (!runProviderId) {
      setRunError("Connect Claude or Codex in Settings before regenerating a section.");
      return;
    }

    setRunError(null);

    try {
      await regenerateSection.regenerate(sectionId, runProviderId);
    } catch (error) {
      setRunError(error instanceof Error ? error.message : "Could not regenerate Strategy.");
    }
  }

  function startEditing() {
    setEditSections(cloneSections(sections));
    setIsEditing(true);
  }

  function discardEditing() {
    setEditSections([]);
    setIsEditing(false);
    setSaveError(null);
  }

  async function saveEditing() {
    try {
      await persistSections(editSections, { exitEditMode: true });
    } catch {
      // saveError already set
    }
  }

  function updateEditSection(sectionId: string, nextSection: StrategySection) {
    setEditSections((current) => current.map((section) => (
      section.id === sectionId ? nextSection : section
    )));
  }

  function startAddingSection() {
    setDraftTitle("");
    setDraftBody("");
    setSaveError(null);
    setIsAdding(true);
  }

  function cancelAddingSection() {
    setDraftTitle("");
    setDraftBody("");
    setSaveError(null);
    setIsAdding(false);
  }

  function updateSectionEmoji(sectionId: string, emoji: string) {
    if (isEditing) {
      setEditSections((current) => current.map((section) => (
        section.id === sectionId ? { ...section, emoji } : section
      )));
      return;
    }

    const nextSections = latestSectionsRef.current.map((section) => (
      section.id === sectionId ? { ...section, emoji } : section
    ));
    const saveSnapshot = cloneSections(nextSections);

    latestSectionsRef.current = nextSections;
    setSections(nextSections);
    pendingEmojiSaveCountRef.current += 1;

    emojiSaveQueueRef.current = emojiSaveQueueRef.current
      .catch(() => undefined)
      .then(async () => {
        try {
          await persistSections(saveSnapshot, { updateLocalState: false });
          lastPersistedEmojiSectionsRef.current = cloneSections(saveSnapshot);
        } catch {
          if (latestSectionsRef.current === nextSections) {
            const fallbackSections = cloneSections(lastPersistedEmojiSectionsRef.current);
            latestSectionsRef.current = fallbackSections;
            setSections(fallbackSections);
          }
        } finally {
          pendingEmojiSaveCountRef.current -= 1;
        }
      });
  }

  async function saveDraftSection() {
    const title = draftTitle.trim();
    const body = draftBody.trim();
    if (!title || !body) {
      setSaveError("Add a section title and body.");
      return;
    }

    const baseSections = isEditing ? editSections : sections;
    const nextSections = [
      ...baseSections,
      {
        id: `custom-${Date.now()}`,
        title,
        status: "approved" as const,
        kind: "paragraph" as const,
        body: [body],
      },
    ];

    try {
      await persistSections(nextSections);
      if (isEditing) {
        setEditSections(cloneSections(nextSections));
      }
      setDraftTitle("");
      setDraftBody("");
      setIsAdding(false);
    } catch {
      // saveError already set
    }
  }

  if (strategy.isLoading) {
    return (
      <section className="rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
        <div className="rounded-[8px] bg-white px-[clamp(24px,3.8vw,44px)] py-[44px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
          <p className="text-[13px] font-medium leading-[1.5] text-[#737373]">Loading strategy...</p>
        </div>
      </section>
    );
  }

  if (!strategy.hasResearch) {
    const replacingResearch = researchRun.isReplacingResearch;

    return (
      <section className="rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
        <div className="rounded-[8px] bg-white shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
          <div className="flex w-full flex-col gap-1 rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
            <div className="flex items-center justify-center p-4">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p className="text-[15px] font-medium leading-none text-[#171717]">Generate Strategy</p>
                <p className="max-w-[420px] text-[12px] font-medium leading-[1.5] text-[#737373]">
                  Strategy is generated from the research. Run research first, then come back here to generate the strategy.
                </p>
              </div>
            </div>

            <div className="rounded-[8px] bg-white px-11 py-11 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
              <div className="flex max-w-[420px] flex-col gap-6">
                <div className="flex flex-col gap-2">
                  <p className="text-[20px] font-semibold leading-[1.2] text-[#171717]">
                    {replacingResearch ? "Research is being replaced" : "Research required"}
                  </p>
                  <p className="text-[13px] font-medium leading-[1.6] text-[#737373]">
                    {replacingResearch
                      ? "Saved research and strategy were cleared for a re-run. Stay on Research to watch progress, or come back when the new research artifact is ready."
                      : "We need the project research before strategy can be generated. Add the project context in Research and run it first."}
                  </p>
                  {strategy.researchError ? (
                    <p className="text-[13px] font-medium leading-[1.5] text-[#DC2626]">
                      {strategy.researchError}
                    </p>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={onGoToResearch}
                    className="inline-flex h-8 items-center justify-center gap-2 rounded-[6px] border border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7B76DF] to-[#463FBA] px-3 text-[13px] font-medium leading-[1.25] text-[#FAFAFA] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-opacity hover:opacity-95"
                  >
                    {replacingResearch ? "View Research progress" : "Go to Research"}
                    <ArrowRightIcon />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (researchRun.isReplacingResearch) {
    return (
      <section className="rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
        <div className="rounded-[8px] bg-white px-[44px] py-[44px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
          <div className="flex min-h-[320px] items-center justify-center">
            <div className="flex max-w-[360px] flex-col items-center gap-3 text-center">
              <img
                src="/logos/dashboard/research.svg"
                alt=""
                aria-hidden="true"
                className="h-[37px] w-[37px] animate-spin"
              />
              <p className="text-[16px] font-semibold leading-none text-[#171717]">
                Research is being replaced
              </p>
              <p className="text-[13px] font-medium leading-[1.5] text-[#525252]">
                Saved strategy was cleared. Generate strategy again after the new research run
                finishes.
              </p>
              <button
                type="button"
                onClick={onGoToResearch}
                className="inline-flex h-8 items-center justify-center gap-2 rounded-[6px] bg-[#F5F5F5] px-3 text-[13px] font-medium leading-[1.25] text-[#525252] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] hover:bg-[#ECECEC]"
              >
                View Research progress
                <ArrowRightIcon />
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const isLaunchingStrategy =
    autoStartGeneration || strategy.isStarting || strategy.isRunning;

  if (isLaunchingStrategy && !strategy.hasArtifact) {
    return <StrategyGeneratingState usingMockData={strategy.usingMockData} />;
  }

  if (isFullStrategyRegenerating) {
    return (
      <StrategyGeneratingState
        mode="regenerate"
        usingMockData={strategy.usingMockData}
      />
    );
  }

  if (regeneratingSectionId) {
    const section = visibleSections.find((item) => item.id === regeneratingSectionId);
    return (
      <StrategyGeneratingState
        mode="regenerate"
        sectionTitle={section?.title}
        usingMockData={strategy.usingMockData}
      />
    );
  }

  if (!strategy.hasArtifact || !strategy.data) {
    return (
      <div className="flex flex-col gap-4">
        {strategy.parseError ? (
          <p className="text-[13px] font-medium leading-[1.5] text-[#DC2626]">
            Saved strategy exists but could not be parsed. Try generating Strategy again.
          </p>
        ) : null}
        {runError || strategy.error ? (
          <p className="text-[13px] font-medium leading-[1.5] text-[#DC2626]">
            {runError ?? strategy.error}
          </p>
        ) : null}
        <StrategyGenerateStep
          isSubmitting={strategy.isStarting || strategy.isRunning}
          onSubmit={(input, providerId) => void handleGenerateStrategy(input, providerId)}
          providerOptions={providerOptions}
          selectedProviderId={selectedProviderId}
          onSelectProvider={selectProvider}
          runSettingsInDialog
        />
      </div>
    );
  }

  return (
    <>
      <section className="rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
        <div className="rounded-[8px] bg-white p-[clamp(24px,3.8vw,44px)] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
          <div className="flex flex-col gap-6">
            {runError || saveError || notionExport.exportError || (!strategy.hasArtifact && strategy.error) ? (
              <p className="whitespace-pre-wrap text-[13px] font-medium leading-[1.5] text-[#DC2626]">
                {runError ?? saveError ?? notionExport.exportError ?? strategy.error}
              </p>
            ) : null}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-[10px] w-[65px] overflow-hidden rounded-full bg-[#E5E5E5]">
                <div
                  className="h-full rounded-full bg-[#16A34A] transition-[width]"
                  style={{ width: `${Math.max(8, (approvedCount / visibleSections.length) * 100)}%` }}
                />
              </div>
              <p className="text-[13px] font-medium leading-[1.25] text-[#171717]">
                {approvedCount} of {visibleSections.length} sections approved
              </p>
              <MetaDot />
              <p className="text-[13px] font-medium leading-[1.25] text-[#737373]">Total {visibleSections.length} sections</p>
              <MetaDot />
              <p className="text-[13px] font-medium leading-[1.25] text-[#737373]">Based on Research</p>
            </div>
            {isEditing ? (
              <div className="flex items-start gap-2">
                <button
                  type="button"
                  onClick={discardEditing}
                  className="inline-flex h-8 cursor-pointer items-center rounded-[6px] bg-[#F5F5F5] px-3 py-2 text-[12px] font-medium leading-[1.25] text-[#EF4444] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] hover:bg-[#FEF2F2]"
                >
                  Discard Changes
                </button>
                <button
                  type="button"
                  onClick={saveEditing}
                  disabled={isSaving}
                  className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-[6px] border border-[#34D399] bg-gradient-to-b from-[#10B981] to-[#059669] px-3 py-[6px] text-[12px] font-medium leading-[1.25] text-[#ECFDF5] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] hover:opacity-95"
                >
                  <SaveIcon />
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            ) : (
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsRegenerateDialogOpen(true)}
                  disabled={isRunBusy}
                  className="inline-flex h-[34px] shrink-0 cursor-pointer items-center justify-center gap-2 rounded-[6px] bg-[#F5F5F5] py-2 pl-[10px] pr-3 text-[13px] font-medium leading-none text-[#525252] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#ECECEC] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Regenerate strategy
                </button>
                <button
                  type="button"
                  onClick={startEditing}
                  disabled={isRunBusy}
                  className="inline-flex h-[34px] cursor-pointer items-center gap-2 rounded-[6px] bg-[#F5F5F5] py-2 pl-[10px] pr-3 text-[13px] font-medium leading-none text-[#525252] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] hover:bg-[#ECECEC] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <EditIcon />
                  Edit Strategy
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-6">
            {visibleSections.map((section, index) => (
              <StrategySectionCard
                key={section.id}
                section={section}
                showDivider={index > 0}
                isEditing={isEditing}
                isRegenerating={regeneratingSectionId === section.id}
                onSectionChange={(nextSection) => updateEditSection(section.id, nextSection)}
                onEmojiChange={(emoji) => void updateSectionEmoji(section.id, emoji)}
                onDelete={section.id.startsWith("custom-")
                  ? () => setEditSections((current) => current.filter((item) => item.id !== section.id))
                  : undefined}
                onApprove={() => void approveSection(section.id)}
                onUnapprove={() => void unapproveSection(section.id)}
                onRegenerate={() => void handleRegenerateSection(section.id)}
              />
            ))}
          </div>

          {isAdding ? (
            <AddSectionEditor
              title={draftTitle}
              body={draftBody}
              onTitleChange={setDraftTitle}
              onBodyChange={setDraftBody}
              onSave={saveDraftSection}
              onCancel={cancelAddingSection}
            />
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-4">
            <button
              type="button"
              onClick={startAddingSection}
              disabled={isAdding || isRunBusy}
              className="inline-flex h-8 items-center gap-2 rounded-[6px] text-[13px] font-medium leading-[1.25] text-[#525252] transition-colors hover:text-[#171717] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <PlusIcon />
              Add Section
            </button>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void notionExport.exportToNotion()}
                disabled={notionExport.isExporting}
                className="inline-flex h-[31px] cursor-pointer items-center gap-[6px] rounded-[6px] bg-[#F5F5F5] px-2 text-[13px] font-medium leading-[1.25] text-[#525252] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] hover:bg-[#ECECEC] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <NotionIcon />
                {notionExport.isExporting ? "Exporting…" : "Add to Notion"}
              </button>
              <button
                type="button"
                onClick={onGoToMoodboard}
                className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-[6px] border border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7B76DF] to-[#463FBA] py-2 pl-3 pr-[10px] text-[13px] font-medium leading-[1.25] text-[#FAFAFA] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-opacity hover:opacity-95"
              >
                Continue to Moodboard
                <ArrowRightIcon />
              </button>
            </div>
          </div>
        </div>
        </div>
      </section>
      <NotionParentPageDialog
        open={notionExport.needsParentPage}
        onOpenChange={(open) => {
          if (!open) {
            notionExport.dismissParentPagePrompt();
          }
        }}
        onSubmit={(parentPageUrl) => void notionExport.exportToNotion(parentPageUrl)}
        isSubmitting={notionExport.isExporting}
        errorMessage={notionExport.exportError}
      />
      <StrategyRegenerateDialog
        open={isRegenerateDialogOpen}
        onOpenChange={setIsRegenerateDialogOpen}
        initialValues={regenerateFormInitialValues}
        isSubmitting={isRunBusy}
        approvedSectionCount={approvedCount}
        onSubmit={(input, providerId) =>
          void handleGenerateStrategy(input, providerId, {
            isFullRegenerate: true,
            regenerateUnapprovedOnly: approvedCount > 0,
          })
        }
        providerOptions={providerOptions}
        selectedProviderId={selectedProviderId}
        onSelectProvider={selectProvider}
      />
      <DownstreamStepsDialog
        open={downstreamPrompt.dialogOpen}
        onOpenChange={downstreamPrompt.setDialogOpen}
        upstreamKind={downstreamPrompt.upstreamKind}
        onKeep={downstreamPrompt.keepDownstream}
        onClear={() => void downstreamPrompt.clearDownstreamWork()}
        isClearing={downstreamPrompt.isClearing}
        errorMessage={downstreamPrompt.clearError}
      />
    </>
  );
}

function StrategyGeneratingState({
  usingMockData,
  mode = "generate",
  sectionTitle,
}: {
  usingMockData: boolean;
  mode?: "generate" | "regenerate";
  sectionTitle?: string;
}) {
  const isRegenerating = mode === "regenerate";

  return (
    <section className="rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
      <div className="rounded-[8px] bg-white px-[44px] py-[44px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
        <div className="flex min-h-[520px] items-center justify-center">
          <div className="flex w-full max-w-[282px] flex-col items-center gap-6">
            <img
              src={isRegenerating ? "/logos/dashboard/strategy.svg" : "/logos/generating-strategy.svg"}
              alt=""
              aria-hidden="true"
              className={`h-[37px] w-[37px] ${isRegenerating ? "" : "animate-spin"}`}
            />

            <div className="flex w-full flex-col items-center gap-2">
              <p className="text-center text-[16px] font-semibold leading-none text-[#171717]">
                {isRegenerating ? `Regenerating ${sectionTitle ?? "Strategy"}` : "Generating Strategy"}
              </p>
              <p className="text-center text-[13px] font-medium leading-[1.5] text-[#525252]">
                {isRegenerating
                  ? "Refreshing this section with the current research context."
                  : usingMockData
                  ? "Turning research into strategy sections. Results will appear here when the mock run completes."
                  : "Extracting structural patterns - AI ignores color, typography, and visual style."}
              </p>
            </div>

            <div className="flex w-full flex-col items-center gap-2">
              <StrategyLoadingStep icon="/logos/check.svg" label={isRegenerating ? "Section loaded" : "Identified Goals & KPIs"} />
              <StrategyLoadingStep icon="/logos/check.svg" label={isRegenerating ? "Research context attached" : "Created user journey"} />
              <StrategyLoadingStep icon="/logos/loader.svg" label={isRegenerating ? "Generating replacement content" : "Generating conversion approach"} spinning />
              <StrategyLoadingStep icon="/logos/unchecked.svg" label={isRegenerating ? "Updating strategy section" : "Identify Technical Requirements"} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function StrategyLoadingStep({
  icon,
  label,
  spinning = false,
}: {
  icon: string;
  label: string;
  spinning?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <img
        src={icon}
        alt=""
        aria-hidden="true"
        className={cn("shrink-0", spinning ? "h-[16px] w-[16px] animate-spin" : "h-[18px] w-[18px]")}
      />
      <p className="text-center text-[13px] font-medium leading-[1.5] text-[#525252]">
        {label}
      </p>
    </div>
  );
}
