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

function joinSentences(sentences: string[]) {
  return sentences
    .map((sentence) => sentence.trim().replace(/[.。]+$/u, ""))
    .filter(Boolean)
    .join(". ");
}

function companySnapshotRank(label: string) {
  switch (label.trim().toLowerCase()) {
    case "company":
    case "client":
      return 0;
    case "industry":
      return 1;
    case "product":
    case "project focus":
    case "primary product surface":
      return 2;
    case "target user":
    case "target users":
    case "audience":
      return 3;
    case "platform":
      return 4;
    case "stage":
      return 5;
    case "context":
    case "description":
    case "strategic context":
      return 6;
    case "website":
      return 7;
    default:
      return 50;
  }
}

function sortCompanySnapshotRows(rows: ResearchArtifact["companySnapshot"]) {
  return [...rows].sort((a, b) => companySnapshotRank(a.label) - companySnapshotRank(b.label));
}

function mapRecognizedPatterns(
  patterns: string[],
  group: ResearchArtifact["uiPatterns"][number],
) {
  const exampleProducts = Array.from(
    new Set(
      group.examples
        .map((example) => example.sourceProduct?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  ).slice(0, 2);
  const sourceLabel =
    exampleProducts.length > 0 ? ` in ${exampleProducts.join(" and ")} references` : " across the Refero references";

  return patterns.map((pattern) => {
    const body = patternBody(pattern, group.title, sourceLabel);
    return [pattern, body] as const;
  });
}

function patternBody(pattern: string, groupTitle: string, sourceLabel: string) {
  const text = pattern.toLowerCase();
  const category = groupTitle.toLowerCase();

  if (text.includes("hero") || text.includes("headline") || text.includes("outcome")) {
    return `Lead with the user outcome before feature detail${sourceLabel}.`;
  }
  if (text.includes("wizard") || text.includes("step") || text.includes("setup") || text.includes("guided")) {
    return `Break setup into clear next actions so users always know what to do next${sourceLabel}.`;
  }
  if (text.includes("card") || text.includes("grid")) {
    return `Use compact cards to make options and status easy to scan${sourceLabel}.`;
  }
  if (text.includes("approval") || text.includes("queue")) {
    return `Surface approval work as a first-class workflow, not hidden admin detail${sourceLabel}.`;
  }
  if (text.includes("mobile") || text.includes("checkout") || text.includes("cart")) {
    return `Keep review, totals, and submission visible for repeat mobile decisions${sourceLabel}.`;
  }
  if (text.includes("trust") || text.includes("proof") || text.includes("security")) {
    return `Place reassurance close to high-intent actions${sourceLabel}.`;
  }
  if (text.includes("pricing") || text.includes("comparison") || text.includes("plan")) {
    return `Compare choices in a structured layout before asking for commitment${sourceLabel}.`;
  }
  if (text.includes("navigation") || text.includes("segmented")) {
    return `Separate entry points by user intent so people can self-route quickly${sourceLabel}.`;
  }

  return `Useful ${category} pattern detected from the Refero reference set.`;
}

export function mapResearchArtifactToTabData(artifact: ResearchArtifact): ResearchTabData {
  const competitors: ResearchCompetitor[] = artifact.competitiveAnalysis.competitors.map(
    (competitor, index) => ({
      id: competitor.id,
      name: competitor.name,
      url: competitor.url ?? "",
      mark: competitorMark(competitor.name, competitor.mark ?? undefined),
      color: competitorColor(index, competitor.color ?? undefined),
      tagline: competitor.positioning ?? competitor.summary ?? "",
      note: competitor.summary ?? competitor.positioning ?? "",
      strengths: competitor.strengths,
      weaknesses: competitor.weaknesses,
    }),
  );

  const competitiveMatrixRows = artifact.competitiveAnalysis.matrixRows.map((row) => ({
    label: row.label,
    cells: row.cells
      .filter((cell) => cell.score === "Strong" || cell.score === "OK" || cell.score === "Weak")
      .map((cell) => ({
        competitorId: cell.competitorId,
        score: cell.score,
        note: cell.note?.trim() ?? "",
      })),
  }));

  const uiPatternGroups: UiPatternGroupWithPatterns[] = artifact.uiPatterns.map((group) => ({
    id: group.id,
    title: group.title,
    images: group.examples
      .map((example) => {
        const fullSrc = example.imageUrl ?? example.thumbnailUrl ?? "";
        const src = example.thumbnailUrl ?? example.imageUrl ?? "";
        return src && fullSrc ? { src, fullSrc } : null;
      })
      .filter((image): image is { src: string; fullSrc: string } => Boolean(image)),
    recognizedPatterns: mapRecognizedPatterns(group.recognizedPatterns, group),
  }));

  const targetUsers: ResearchTargetUser[] = artifact.targetUsers.map((user) => ({
    name: user.name,
    role: user.role,
    goals: joinSentences(user.goals),
    frustration: joinSentences(user.frustrations),
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
    companySnapshot: sortCompanySnapshotRows(artifact.companySnapshot).map((row) => [row.label, row.value] as const),
    competitors,
    competitiveMatrixRows,
    uiPatternGroups,
    targetUsers,
    opportunities,
    customSections: (artifact.customSections ?? []).map((section) => ({
      id: section.id,
      title: section.title,
      body: section.body,
    })),
  };
}
