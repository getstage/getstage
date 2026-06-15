import type { ResearchArtifact } from "@stage/data-ops/contracts";
import type { ResearchTabData } from "@/types/project/researchTab";

function optionalText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function requiredText(value: string, fallback: string) {
  return optionalText(value) ?? fallback;
}

function parseListText(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim().replace(/^[-*]\s*/, ""))
    .filter(Boolean);
}

export function applyResearchTabEdits(
  artifact: ResearchArtifact,
  tabData: ResearchTabData,
): ResearchArtifact {
  return {
    ...artifact,
    summary: tabData.summary,
    companySnapshot: tabData.companySnapshot.map(([label, value], index) => {
      const existing = artifact.companySnapshot[index];
      return {
        label: requiredText(label, existing?.label ?? `Snapshot ${index + 1}`),
        value: requiredText(value, existing?.value ?? "Not specified"),
      };
    }),
    competitiveAnalysis: {
      competitors: tabData.competitors.map((competitor, index) => {
        const existing = artifact.competitiveAnalysis.competitors[index];
        return {
          id: competitor.id || existing?.id || `competitor-${index + 1}`,
          name: requiredText(competitor.name, existing?.name ?? `Competitor ${index + 1}`),
          url: optionalText(competitor.url),
          logoUrl: existing?.logoUrl ?? null,
          mark: optionalText(competitor.mark),
          color: optionalText(competitor.color),
          positioning: optionalText(competitor.tagline),
          summary: optionalText(competitor.note),
          strengths: competitor.strengths.map((item) => item.trim()).filter(Boolean),
          weaknesses: competitor.weaknesses.map((item) => item.trim()).filter(Boolean),
          sourceReferenceIds: existing?.sourceReferenceIds ?? [],
        };
      }),
      matrixRows: artifact.competitiveAnalysis.matrixRows,
    },
    uiPatterns: tabData.uiPatternGroups.map((group, index) => {
      const existing = artifact.uiPatterns[index];
      return {
        id: existing?.id ?? group.id,
        title: requiredText(group.title, existing?.title ?? `Pattern group ${index + 1}`),
        summary: existing?.summary ?? null,
        patternCountLabel: existing?.patternCountLabel ?? null,
        recognizedPatterns: group.recognizedPatterns
          .map(([title]) => title.trim())
          .filter(Boolean),
        examples: existing?.examples ?? [],
      };
    }),
    targetUsers: tabData.targetUsers.map((user, index) => {
      const existing = artifact.targetUsers[index];
      return {
        id: existing?.id ?? `target-user-${index + 1}`,
        name: requiredText(user.name, existing?.name ?? `Target user ${index + 1}`),
        role: requiredText(user.role, existing?.role ?? "User"),
        goals: parseListText(user.goals),
        frustrations: parseListText(user.frustration),
        context: optionalText(user.context),
        relevance: existing?.relevance ?? null,
        assumptions: existing?.assumptions ?? [],
      };
    }),
    customSections: tabData.customSections.map((section, index) => ({
      id: section.id.trim() || `custom-section-${index + 1}`,
      title: requiredText(section.title, `Section ${index + 1}`),
      body: requiredText(section.body, "Not specified"),
    })),
    opportunities: tabData.opportunities.map((description) => description.trim()).filter(Boolean).map((description, index) => {
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
