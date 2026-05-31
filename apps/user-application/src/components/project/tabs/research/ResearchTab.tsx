import { useEffect, useState } from "react";
import type { Project } from "@/models/project/project";
import type { CompetitiveView } from "@/types/project/researchTab";
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

export function ResearchTab({ project: _project }: { project: Project }) {
  const [hasConfiguredResearch, setHasConfiguredResearch] = useState(false);
  const [isRunningResearch, setIsRunningResearch] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [openPatternGroup, setOpenPatternGroup] = useState<string | null>(null);
  const [competitiveView, setCompetitiveView] = useState<CompetitiveView>("card");
  const [openPhoto, setOpenPhoto] = useState<string | null>(null);

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

  function runResearch() {
    if (isRunningResearch) return;
    setIsRunningResearch(true);
    window.setTimeout(() => {
      setIsRunningResearch(false);
      setHasConfiguredResearch(true);
    }, 1200);
  }

  if (!hasConfiguredResearch) {
    return <ResearchConfigureStep isSubmitting={isRunningResearch} onSubmit={runResearch} />;
  }

  return (
    <>
      <section className="rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
        <div className="rounded-[8px] bg-white px-[clamp(24px,3.8vw,44px)] py-[44px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
          <div className="flex w-full flex-col gap-[44px]">
            <ResearchSummary
              isEditing={isEditing}
              onEdit={() => setIsEditing(true)}
              onDiscard={() => setIsEditing(false)}
              onSave={() => setIsEditing(false)}
            />
            <Divider />
            <CompanySnapshot isEditing={isEditing} />
            <Divider />
            <CompetitiveAnalysis
              isEditing={isEditing}
              view={competitiveView}
              onViewChange={setCompetitiveView}
            />
            <Divider />
            <UiPatterns
              isEditing={isEditing}
              openGroupId={openPatternGroup}
              onToggleGroup={(groupId) => setOpenPatternGroup((current) => (current === groupId ? null : groupId))}
              onOpenPhoto={setOpenPhoto}
            />
            <Divider />
            <TargetUsers isEditing={isEditing} />
            <Divider />
            <Opportunities isEditing={isEditing} />
            <Divider />
            <ResearchActions />
          </div>
        </div>
      </section>
      {openPhoto ? <PhotoLightbox src={openPhoto} onClose={() => setOpenPhoto(null)} /> : null}
    </>
  );
}
