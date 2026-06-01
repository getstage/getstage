import type { ResearchArtifact } from "@stage/data-ops/contracts";
import type { ResearchTabData } from "@/types/project/researchTab";

export function applyResearchTabEdits(
  artifact: ResearchArtifact,
  tabData: ResearchTabData,
): ResearchArtifact {
  return {
    ...artifact,
    summary: tabData.summary,
    companySnapshot: tabData.companySnapshot.map(([label, value]) => ({ label, value })),
    opportunities: tabData.opportunities.map((description, index) => {
      const existing = artifact.opportunities[index];
      const colonIndex = description.indexOf(":");
      if (colonIndex > 0) {
        return {
          id: existing?.id ?? `opportunity-${index + 1}`,
          title: description.slice(0, colonIndex).trim(),
          description: description.slice(colonIndex + 1).trim(),
          sourceSection: existing?.sourceSection,
        };
      }

      return {
        id: existing?.id ?? `opportunity-${index + 1}`,
        title: existing?.title,
        description,
        sourceSection: existing?.sourceSection,
      };
    }),
  };
}
