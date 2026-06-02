import { useEffect, useState } from "react";
import type { Project } from "@/models/project/project";
import type { ValidatedResearchConfigureInput } from "@/lib/project/researchConfigureInput";
import type { ProviderId, ResearchArtifactSection } from "@stage/data-ops/contracts";
import type { CompetitiveView, ResearchTabData } from "@/types/project/researchTab";
import { useResearchContext } from "@/hooks/project/research/useResearchContext";
import { useResearchProviderSelection } from "@/hooks/project/research/useResearchProviderSelection";
import { useResearchSectionRegenerate } from "@/hooks/project/research/useResearchSectionRegenerate";
import { useSaveResearchArtifact } from "@/hooks/project/research/useSaveResearchArtifact";
import { useResearchTab } from "@/hooks/project";
import { applyResearchTabEdits } from "@/lib/project/applyResearchTabEdits";
import { RESEARCH_RUN_FAILED_USER_MESSAGE } from "@/lib/engine/formatRunError";
import { cn } from "@/lib/utils";
import { CompanySnapshot } from "./CompanySnapshot";
import { CompetitiveAnalysis } from "./CompetitiveAnalysis";
import { Opportunities } from "./Opportunities";
import { PhotoLightbox } from "./PhotoLightbox";
import { ResearchActions } from "./ResearchActions";
import { ResearchConfigureStep } from "./ResearchConfigureStep";
import { Divider } from "./ResearchPrimitives";
import { ResearchSummary } from "./ResearchSummary";
import { TargetUsers } from "./TargetUsers";
import { UiPatterns } from "./UiPatterns";

export function ResearchTab({
  project,
  onGenerateStrategy,
}: {
  project: Project;
  onGenerateStrategy: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftTabData, setDraftTabData] = useState<ResearchTabData | null>(null);
  const [summaryDraft, setSummaryDraft] = useState<string[]>([]);
  const [openPatternGroup, setOpenPatternGroup] = useState<string | null>(null);
  const [competitiveView, setCompetitiveView] = useState<CompetitiveView>("matrix");
  const [openPhoto, setOpenPhoto] = useState<string | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [regeneratingSection, setRegeneratingSection] = useState<ResearchArtifactSection | null>(null);

  const research = useResearchTab(project);
  const researchContext = useResearchContext(project.id);
  const saveResearchArtifact = useSaveResearchArtifact(project.id);
  const regenerateSection = useResearchSectionRegenerate(project.id);
  const { selectedProviderId } = useResearchProviderSelection();

  useEffect(() => {
    if (!openPhoto) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenPhoto(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [openPhoto]);

  async function handleRunResearch(input?: ValidatedResearchConfigureInput, providerId?: ProviderId) {
    setRunError(null);

    try {
      await research.startResearch(input, providerId);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : RESEARCH_RUN_FAILED_USER_MESSAGE;
      if (!(error instanceof Error)) {
        console.error("[stage-engine] research start failed", error);
      }
      setRunError(message);
    }
  }

  function beginEditing() {
    if (!research.data) {
      return;
    }

    setDraftTabData(structuredClone(research.data.tabData));
    setSummaryDraft([...research.data.tabData.summary]);
    setIsEditing(true);
    setSaveError(null);
  }

  function discardEditing() {
    setIsEditing(false);
    setDraftTabData(null);
    setSummaryDraft([]);
    setSaveError(null);
  }

  async function saveEditing() {
    if (!research.data || !draftTabData) {
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const nextTabData: ResearchTabData = {
        ...draftTabData,
        summary: summaryDraft.map((item) => item.trim()).filter(Boolean),
      };
      const nextArtifact = applyResearchTabEdits(research.data.artifact, nextTabData);
      await saveResearchArtifact(research.data.id, nextArtifact);
      setIsEditing(false);
      setDraftTabData(null);
      setSummaryDraft([]);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Could not save research changes.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRegenerateSection(section: ResearchArtifactSection) {
    setRunError(null);
    setRegeneratingSection(section);

    if (!selectedProviderId) {
      await delay(900);
      if (!research.usingMockData) {
        setRunError("Choose Claude or Codex before regenerating a section.");
      }
      setRegeneratingSection(null);
      return;
    }

    try {
      await Promise.all([
        regenerateSection(section, selectedProviderId),
        delay(900),
      ]);
    } catch (error) {
      setRunError(error instanceof Error ? error.message : RESEARCH_RUN_FAILED_USER_MESSAGE);
    } finally {
      setRegeneratingSection(null);
    }
  }

  if (research.isLoading) {
    return (
      <section className="rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
        <div className="rounded-[8px] bg-white px-[clamp(24px,3.8vw,44px)] py-[44px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
          <p className="text-[13px] font-medium leading-[1.5] text-[#737373]">Loading research...</p>
        </div>
      </section>
    );
  }

  if (!research.hasArtifact || !research.data) {
    if (research.isRunning) {
      return <ResearchGeneratingState usingMockData={research.usingMockData} />;
    }

    return (
      <div className="flex flex-col gap-4">
        {research.parseErrorMessage ? (
          <p className="text-[13px] font-medium leading-[1.5] text-[#DC2626]">
            {research.parseErrorMessage}
          </p>
        ) : null}
        {runError || research.error ? (
          <p className="whitespace-pre-wrap text-[13px] font-medium leading-[1.5] text-[#DC2626]">
            {runError ?? research.error}
          </p>
        ) : null}
        <ResearchConfigureStep
          isSubmitting={research.isStarting || research.isRunning}
          initialValues={researchContext.initialValues}
          onBriefFileChange={research.setBriefFile}
          onSubmit={(input, providerId) => void handleRunResearch(input, providerId)}
        />
      </div>
    );
  }

  const tabData = isEditing && draftTabData ? draftTabData : research.data.tabData;

  if (regeneratingSection) {
    return <ResearchGeneratingState mode="regenerate" section={regeneratingSection} usingMockData={false} />;
  }

  if (research.isRunning) {
    return <ResearchGeneratingState mode="generate" usingMockData={research.usingMockData} />;
  }

  return (
    <>
      <section className="rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
        <div className="rounded-[8px] bg-white px-[clamp(24px,3.8vw,44px)] py-[44px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
          <div className="flex w-full flex-col gap-[44px]">
            {runError || research.error || saveError ? (
              <p className="whitespace-pre-wrap text-[13px] font-medium leading-[1.5] text-[#DC2626]">
                {runError ?? saveError ?? research.error}
              </p>
            ) : null}
            {research.isRunning ? (
              <p className="text-[13px] font-medium leading-[1.5] text-[#737373]">
                Research is running. This tab updates when the artifact is saved.
              </p>
            ) : null}
            <ResearchSummary
              summary={tabData.summary}
              isEditing={isEditing}
              editItems={summaryDraft}
              onEditItemsChange={setSummaryDraft}
              onEdit={beginEditing}
              onDiscard={discardEditing}
              onSave={() => void saveEditing()}
              isSaving={isSaving}
            />
            <Divider />
            <CompanySnapshot rows={tabData.companySnapshot} isEditing={isEditing} />
            <Divider />
            <CompetitiveAnalysis
              isEditing={isEditing}
              view={competitiveView}
              competitors={tabData.competitors}
              matrixRows={tabData.competitiveMatrixRows}
              onViewChange={setCompetitiveView}
            />
            <Divider />
            <UiPatterns
              groups={tabData.uiPatternGroups}
              isEditing={isEditing}
              openGroupId={openPatternGroup}
              onToggleGroup={(groupId) => setOpenPatternGroup((current) => (current === groupId ? null : groupId))}
              onOpenPhoto={setOpenPhoto}
              onRegenerate={() => void handleRegenerateSection("uiPatterns")}
            />
            <Divider />
            <TargetUsers users={tabData.targetUsers} isEditing={isEditing} />
            <Divider />
            <Opportunities
              opportunities={tabData.opportunities}
              isEditing={isEditing}
              onRegenerate={() => void handleRegenerateSection("opportunities")}
            />
            <Divider />
            <ResearchActions onGenerateStrategy={onGenerateStrategy} />
          </div>
        </div>
      </section>
      {openPhoto ? <PhotoLightbox src={openPhoto} onClose={() => setOpenPhoto(null)} /> : null}
    </>
  );
}

function ResearchGeneratingState({
  usingMockData,
  mode = "generate",
  section,
}: {
  usingMockData: boolean;
  mode?: "generate" | "regenerate";
  section?: ResearchArtifactSection;
}) {
  const isRegenerating = mode === "regenerate";
  const sectionLabel = section ? RESEARCH_SECTION_LABELS[section] : "Research";

  return (
    <section className="rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
      <div className="rounded-[8px] bg-white px-[44px] py-[44px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
        <div className="flex min-h-[520px] items-center justify-center">
          <div className="flex w-full max-w-[282px] flex-col items-center gap-6">
            <img
              src="/logos/dashboard/research.svg"
              alt=""
              aria-hidden="true"
              className="h-[37px] w-[37px]"
            />

            <div className="flex w-full flex-col items-center gap-2">
              <p className="text-center text-[16px] font-semibold leading-none text-[#171717]">
                {isRegenerating ? `Regenerating ${sectionLabel}` : "Researching Project"}
              </p>
              <p className="text-center text-[13px] font-medium leading-[1.5] text-[#525252]">
                {isRegenerating
                  ? "Refreshing this section with the latest project context. The updated result will appear when the run completes."
                  : usingMockData
                  ? "Building a test research report from the project context. The results will appear here when the run completes."
                  : "Analysing the market, competitors, UI patterns, target users, and product opportunities."}
              </p>
            </div>

            <div className="flex w-full flex-col items-center gap-2">
              <ResearchLoadingStep icon="/logos/check.svg" label={isRegenerating ? "Current section loaded" : "Project context prepared"} />
              <ResearchLoadingStep icon="/logos/check.svg" label={isRegenerating ? "Project context attached" : "Competitor set selected"} />
              <ResearchLoadingStep icon="/logos/loader.svg" label={isRegenerating ? "Generating replacement content" : "Analysing patterns and users"} spinning />
              <ResearchLoadingStep icon="/logos/unchecked.svg" label={isRegenerating ? "Updating section" : "Creating final report"} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const RESEARCH_SECTION_LABELS: Record<ResearchArtifactSection, string> = {
  summary: "Research Summary",
  companySnapshot: "Company Snapshot",
  competitiveAnalysis: "Competitive Analysis",
  uiPatterns: "UI Patterns",
  targetUsers: "Target Users",
  opportunities: "Opportunities",
};

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function ResearchLoadingStep({
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
