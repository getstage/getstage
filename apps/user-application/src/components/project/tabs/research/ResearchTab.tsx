import { useEffect, useState } from "react";
import type { Project } from "@/models/project/project";
import type { CompetitiveView } from "@/types/project/researchTab";
import { useResearchArtifact, useResearchRun } from "@/hooks/project";
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

export function ResearchTab({ project }: { project: Project }) {
  const [isEditing, setIsEditing] = useState(false);
  const [openPatternGroup, setOpenPatternGroup] = useState<string | null>(null);
  const [competitiveView, setCompetitiveView] = useState<CompetitiveView>("card");
  const [openPhoto, setOpenPhoto] = useState<string | null>(null);
  const [runError, setRunError] = useState<string | null>(null);

  const researchArtifact = useResearchArtifact(project.id);
  const researchRun = useResearchRun(project.id);

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

  async function handleRunResearch() {
    setRunError(null);

    try {
      await researchRun.startResearch();
    } catch (error) {
      setRunError(error instanceof Error ? error.message : "Could not start Research.");
    }
  }

  if (researchArtifact.isLoading) {
    return (
      <section className="rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
        <div className="rounded-[8px] bg-white px-[clamp(24px,3.8vw,44px)] py-[44px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
          <p className="text-[13px] font-medium leading-[1.5] text-[#737373]">Loading research...</p>
        </div>
      </section>
    );
  }

  if (!researchArtifact.hasArtifact || !researchArtifact.data) {
    return (
      <div className="flex flex-col gap-4">
        {researchArtifact.parseError ? (
          <p className="text-[13px] font-medium leading-[1.5] text-[#DC2626]">
            Saved research exists but could not be parsed. Try running Research again.
          </p>
        ) : null}
        {runError || researchRun.error ? (
          <p className="text-[13px] font-medium leading-[1.5] text-[#DC2626]">
            {runError ?? researchRun.error}
          </p>
        ) : null}
        <ResearchConfigureStep
          isSubmitting={researchRun.isStarting || researchRun.isRunning}
          onSubmit={() => void handleRunResearch()}
        />
      </div>
    );
  }

  const { tabData } = researchArtifact.data;

  return (
    <>
      <section className="rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
        <div className="rounded-[8px] bg-white px-[clamp(24px,3.8vw,44px)] py-[44px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
          <div className="flex w-full flex-col gap-[44px]">
            {runError || researchRun.error ? (
              <p className="text-[13px] font-medium leading-[1.5] text-[#DC2626]">
                {runError ?? researchRun.error}
              </p>
            ) : null}
            {researchRun.isRunning ? (
              <p className="text-[13px] font-medium leading-[1.5] text-[#737373]">
                Research is running. This tab will refresh when the artifact is saved.
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
            <ResearchActions
              canRunResearch
              onRunResearch={() => void handleRunResearch()}
              isRunning={researchRun.isStarting || researchRun.isRunning}
            />
          </div>
        </div>
      </section>
      {openPhoto ? <PhotoLightbox src={openPhoto} onClose={() => setOpenPhoto(null)} /> : null}
    </>
  );
}
