import type { ResearchArtifact } from "@stage/data-ops/contracts";
import type {
  ResearchCompetitor,
  ResearchTabData,
  ResearchTargetUser,
  UiPatternGroupWithPatterns,
} from "@/types/project/researchTab";

const COMPETITOR_COLORS = ["#FF4A00", "#1ED760", "#635BFF", "#050505", "#2563EB", "#DB2777"];

function competitorColor(index: number, explicit?: string) {
  return explicit ?? COMPETITOR_COLORS[index % COMPETITOR_COLORS.length] ?? "#525252";
}

function competitorMark(name: string, explicit?: string) {
  if (explicit) {
    return explicit;
  }

  const trimmed = name.trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : "?";
}

export function mapResearchArtifactToTabData(artifact: ResearchArtifact): ResearchTabData {
  const competitors: ResearchCompetitor[] = artifact.competitiveAnalysis.competitors.map(
    (competitor, index) => ({
      name: competitor.name,
      url: competitor.url ?? "",
      mark: competitorMark(competitor.name, competitor.mark),
      color: competitorColor(index, competitor.color),
      tagline: competitor.positioning ?? competitor.summary ?? "",
      note: competitor.summary ?? competitor.positioning ?? "",
      strengths: competitor.strengths,
      weaknesses: competitor.weaknesses,
    }),
  );

  const competitorIds = artifact.competitiveAnalysis.competitors.map((competitor) => competitor.id);
  const competitiveMatrixRows = artifact.competitiveAnalysis.matrixRows.map((row) => ({
    label: row.label,
    values: competitorIds.map((competitorId) => {
      const cell = row.cells.find((entry) => entry.competitorId === competitorId);
      return cell?.score ?? "OK";
    }),
  }));

  const uiPatternGroups: UiPatternGroupWithPatterns[] = artifact.uiPatterns.map((group) => ({
    id: group.id,
    title: group.title,
    images: group.examples
      .map((example) => example.imageUrl)
      .filter((imageUrl): imageUrl is string => Boolean(imageUrl)),
    recognizedPatterns: group.recognizedPatterns.map((pattern) => [pattern, group.summary ?? ""] as const),
  }));

  const targetUsers: ResearchTargetUser[] = artifact.targetUsers.map((user) => ({
    name: user.name,
    role: user.role,
    goals: user.goals.join(". "),
    frustration: user.frustrations.join(". "),
    context: user.context ?? user.relevance ?? "",
  }));

  const opportunities = artifact.opportunities.map((opportunity) => {
    if (opportunity.title) {
      return `${opportunity.title}: ${opportunity.description}`;
    }

    return opportunity.description;
  });

  return {
    summary: artifact.summary,
    companySnapshot: artifact.companySnapshot.map((row) => [row.label, row.value] as const),
    competitors,
    competitiveMatrixRows,
    uiPatternGroups,
    targetUsers,
    opportunities,
  };
}
