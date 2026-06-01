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

function splitSummaryText(value: string) {
  return value
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function ResearchTab({
  project,
  onGenerateStrategy,
}: {
  project: Project;
  onGenerateStrategy: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftTabData, setDraftTabData] = useState<ResearchTabData | null>(null);
  const [summaryDraft, setSummaryDraft] = useState("");
  const [openPatternGroup, setOpenPatternGroup] = useState<string | null>(null);
  const [competitiveView, setCompetitiveView] = useState<CompetitiveView>("matrix");
  const [openPhoto, setOpenPhoto] = useState<string | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

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
    setSummaryDraft(research.data.tabData.summary.join("\n"));
    setIsEditing(true);
    setSaveError(null);
  }

  function discardEditing() {
    setIsEditing(false);
    setDraftTabData(null);
    setSummaryDraft("");
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
        summary: splitSummaryText(summaryDraft),
      };
      const nextArtifact = applyResearchTabEdits(research.data.artifact, nextTabData);
      await saveResearchArtifact(research.data.id, nextArtifact);
      setIsEditing(false);
      setDraftTabData(null);
      setSummaryDraft("");
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Could not save research changes.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRegenerateSection(section: ResearchArtifactSection) {
    if (!selectedProviderId) {
      setRunError("Choose Claude or Codex before regenerating a section.");
      return;
    }

    setRunError(null);

    try {
      await regenerateSection(section, selectedProviderId);
    } catch (error) {
      setRunError(error instanceof Error ? error.message : RESEARCH_RUN_FAILED_USER_MESSAGE);
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
              editValue={summaryDraft}
              onEditValueChange={setSummaryDraft}
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
