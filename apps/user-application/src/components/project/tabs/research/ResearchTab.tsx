import { useEffect, useState } from "react";
import type { Project } from "@/models/project/project";
import type { ValidatedResearchConfigureInput } from "@/lib/project/researchConfigureInput";
import type { ProviderId } from "@stage/data-ops/contracts";
import type { CompetitiveView } from "@/types/project/researchTab";
import { useResearchTab } from "@/hooks/project";
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

export function ResearchTab({
  project,
  onGenerateStrategy,
}: {
  project: Project;
  onGenerateStrategy: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [openPatternGroup, setOpenPatternGroup] = useState<string | null>(null);
  const [competitiveView, setCompetitiveView] = useState<CompetitiveView>("matrix");
  const [openPhoto, setOpenPhoto] = useState<string | null>(null);
  const [runError, setRunError] = useState<string | null>(null);

  const research = useResearchTab(project);

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
        {runError || research.error ? (
          <p className="whitespace-pre-wrap text-[13px] font-medium leading-[1.5] text-[#DC2626]">
            {runError ?? research.error}
          </p>
        ) : null}
        <ResearchConfigureStep
          isSubmitting={research.isStarting || research.isRunning}
          onSubmit={(input, providerId) => void handleRunResearch(input, providerId)}
        />
      </div>
    );
  }

  const { tabData } = research.data;

  return (
    <>
      <section className="rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
        <div className="rounded-[8px] bg-white px-[clamp(24px,3.8vw,44px)] py-[44px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
          <div className="flex w-full flex-col gap-[44px]">
            {runError || research.error ? (
              <p className="whitespace-pre-wrap text-[13px] font-medium leading-[1.5] text-[#DC2626]">
                {runError ?? research.error}
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
              onEdit={() => setIsEditing(true)}
              onDiscard={() => setIsEditing(false)}
              onSave={() => setIsEditing(false)}
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
            />
            <Divider />
            <TargetUsers users={tabData.targetUsers} isEditing={isEditing} />
            <Divider />
            <Opportunities opportunities={tabData.opportunities} isEditing={isEditing} />
            <Divider />
            <ResearchActions onGenerateStrategy={onGenerateStrategy} />
          </div>
        </div>
      </section>
      {openPhoto ? <PhotoLightbox src={openPhoto} onClose={() => setOpenPhoto(null)} /> : null}
    </>
  );
}
