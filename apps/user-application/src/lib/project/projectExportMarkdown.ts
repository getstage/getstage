import type {
  AssetsArtifact,
  FlowsArtifact,
  MoodboardArtifact,
  ResearchArtifact,
  StrategyArtifact,
  WireframesArtifact,
} from "@stage/data-ops/contracts";

type AssetPathMap = ReadonlyMap<string, string>;
type UploadedAsset = { title: string; url: string | null; mimeType?: string };

const clean = (value: string) => value.replaceAll("|", "\\|");
const list = (items: string[]) => items.map((item) => `- ${item}`);
const document = (title: string, lines: string[]) =>
  `${[`# ${title}`, "", "Exported from Stage.", ...lines].join("\n")}\n`;

function localImage(
  title: string,
  url: string | null | undefined,
  assetPathByUrl: AssetPathMap,
) {
  const path = url ? assetPathByUrl.get(url) : undefined;
  return path ? [`![${title}](./${path})`] : [];
}

export function researchMarkdown(
  artifact: ResearchArtifact,
  assetPathByUrl: AssetPathMap,
) {
  const lines: string[] = [];
  if (artifact.summary.length) lines.push("", "## Summary", "", ...list(artifact.summary));
  if (artifact.companySnapshot.length) {
    lines.push(
      "",
      "## Company snapshot",
      "",
      "| Topic | Finding |",
      "|---|---|",
      ...artifact.companySnapshot.map(({ label, value }) =>
        `| ${clean(label)} | ${clean(value)} |`,
      ),
    );
  }
  if (artifact.competitiveAnalysis.competitors.length) {
    lines.push("", "## Competitive analysis");
    for (const competitor of artifact.competitiveAnalysis.competitors) {
      lines.push("", `### ${competitor.name}`);
      lines.push(...localImage(`${competitor.name} logo`, competitor.logoUrl, assetPathByUrl));
      if (competitor.positioning) lines.push("", competitor.positioning);
      if (competitor.summary) lines.push("", competitor.summary);
      if (competitor.url) lines.push("", `[Visit website](${competitor.url})`);
      if (competitor.strengths.length) lines.push("", "**Strengths**", "", ...list(competitor.strengths));
      if (competitor.weaknesses.length) lines.push("", "**Weaknesses**", "", ...list(competitor.weaknesses));
    }
    const matrixRows = artifact.competitiveAnalysis.matrixRows;
    if (matrixRows.length) {
      const competitors = artifact.competitiveAnalysis.competitors;
      lines.push(
        "",
        "### Comparison matrix",
        "",
        `| Topic | ${competitors.map(({ name }) => clean(name)).join(" | ")} |`,
        `|---|${competitors.map(() => "---").join("|")}|`,
        ...matrixRows.map((row) => {
          const cells = competitors.map(({ id }) => {
            const cell = row.cells.find((candidate) => candidate.competitorId === id);
            return cell ? `${cell.score}${cell.note ? ` — ${cell.note}` : ""}` : "—";
          });
          return `| ${clean(row.label)} | ${cells.map(clean).join(" | ")} |`;
        }),
      );
    }
  }
  if (artifact.uiPatterns.length) {
    lines.push("", "## UI patterns");
    for (const group of artifact.uiPatterns) {
      lines.push("", `### ${group.title}`);
      if (group.summary) lines.push("", group.summary);
      if (group.patternCountLabel) lines.push("", `**References:** ${group.patternCountLabel}`);
      if (group.recognizedPatterns.length) lines.push("", "**Patterns recognised**", "", ...list(group.recognizedPatterns));
      for (const example of group.examples) {
        const sourceUrl = example.thumbnailUrl ?? example.imageUrl;
        lines.push("", `#### ${example.title}`);
        if (example.sourceProduct) lines.push("", `Source: ${example.sourceProduct}`);
        lines.push(...localImage(example.title, sourceUrl, assetPathByUrl));
      }
    }
  }
  if (artifact.targetUsers.length) {
    lines.push("", "## Target users");
    for (const user of artifact.targetUsers) {
      lines.push("", `### ${user.name} — ${user.role}`);
      if (user.context) lines.push("", user.context);
      if (user.relevance) lines.push("", `**Relevance:** ${user.relevance}`);
      if (user.goals.length) lines.push("", "**Goals**", "", ...list(user.goals));
      if (user.frustrations.length) lines.push("", "**Frustrations**", "", ...list(user.frustrations));
      if (user.assumptions.length) lines.push("", "**Assumptions**", "", ...list(user.assumptions));
    }
  }
  if (artifact.opportunities.length) {
    lines.push("", "## Opportunities", "", ...artifact.opportunities.map((item) =>
      `- **${item.title ?? "Opportunity"}:** ${item.description}`,
    ));
  }
  for (const section of artifact.customSections) lines.push("", `## ${section.title}`, "", section.body);
  if (artifact.openQuestions.length) lines.push("", "## Open questions", "", ...list(artifact.openQuestions));
  if (artifact.sourceReferences.length) {
    lines.push("", "## Sources", "", ...artifact.sourceReferences.map((source) =>
      source.url ? `- [${source.label}](${source.url})` : `- ${source.label}`,
    ));
  }
  return document(artifact.title, lines);
}

export function strategyMarkdown(artifact: StrategyArtifact) {
  const lines: string[] = [];
  for (const section of artifact.sections) {
    lines.push("", `## ${section.emoji ? `${section.emoji} ` : ""}${section.title}`);
    if (section.body?.length) lines.push("", ...section.body);
    for (const principle of section.principles ?? []) {
      lines.push("", `### ${principle.title}`, "", principle.body);
      if (principle.research) lines.push("", `**Research basis:** ${principle.research}`);
    }
    if (section.table?.length) {
      const [[leftHeading, rightHeading], ...rows] = section.table;
      lines.push("", `| ${clean(leftHeading)} | ${clean(rightHeading)} |`, "|---|---|", ...rows.map(
        ([left, right]) => `| ${clean(left)} | ${clean(right)} |`,
      ));
    }
    for (const card of section.cards ?? []) {
      lines.push("", `### ${card.title}`, "", card.objective, "", `**Success measure:** ${card.kpi}`, "", `**Key element:** ${card.keyElement}`);
    }
    for (const box of section.boxes ?? []) lines.push("", `### ${box.title}`, "", ...list(box.bullets));
  }
  return document(artifact.title, lines);
}

export function moodboardMarkdown(
  artifact: MoodboardArtifact,
  assetPathByUrl: AssetPathMap,
) {
  const lines: string[] = [];
  if (artifact.directions.length) {
    lines.push("", "## Creative directions", "");
    for (const direction of artifact.directions) {
      const details = [
        direction.referenceCount === undefined ? null : `${direction.referenceCount} references`,
        direction.hasStyleGuide ? "style guide available" : null,
      ].filter(Boolean);
      lines.push(`- **${direction.name}**${details.length ? ` — ${details.join(", ")}` : ""}`);
    }
  }
  if (artifact.references.length) {
    lines.push("", "## Visual references");
    for (const [index, reference] of artifact.references.entries()) {
      const title = reference.title ?? `Reference ${index + 1}`;
      const imageUrl = reference.imageUrl ?? reference.thumbnailUrl;
      lines.push("", `### ${title}`, "", `Source: ${reference.source}`);
      if (reference.sourceUrl) lines.push("", `[Open original](${reference.sourceUrl})`);
      lines.push(...localImage(title, imageUrl, assetPathByUrl));
    }
  }
  if (artifact.uploadedFiles.length) {
    lines.push("", "## Uploaded references", "", ...artifact.uploadedFiles.map(({ name }) => `- ${name}`));
  }
  return document(artifact.title, lines);
}

export function styleGuideMarkdown(artifact: MoodboardArtifact) {
  const lines: string[] = [];
  for (const guide of artifact.styleGuides) {
    lines.push("", `## ${guide.title}`);
    if (guide.subtitle) lines.push("", guide.subtitle);
    if (guide.atmosphere.length) {
      lines.push("", "### Atmosphere", "", "| Attribute | Direction |", "|---|---|", ...guide.atmosphere.map(
        ({ label, value }) => `| ${clean(label)} | ${clean(value)} |`,
      ));
    }
    if (guide.colorPalettes.length) {
      lines.push("", "### Colour palettes", "", ...guide.colorPalettes.map(({ label, hex, colors }) =>
        `- **${label}:** ${[hex, ...colors.filter((color) => color !== hex)].join(", ")}`,
      ));
    }
    lines.push("", "### Typography", "", `Primary font: **${guide.typography.fontFamily}**`);
    if (guide.typography.fontFamilies.length) lines.push("", `Additional fonts: ${guide.typography.fontFamilies.join(", ")}`);
    if (guide.typography.rows.length) {
      lines.push("", "| Sample | Size | Weight | Line height |", "|---|---:|---|---|", ...guide.typography.rows.map(
        (row) => `| ${clean(row.sampleText ?? "Text style")} | ${row.size}px | ${clean(row.weight)} | ${clean(row.lineHeight)} |`,
      ));
    }
  }
  return document("Style Guide", lines);
}

export function flowsMarkdown(artifact: FlowsArtifact) {
  const lines: string[] = [];
  if (artifact.flows.length) {
    lines.push("", "## User flows");
    for (const flow of artifact.flows) {
      lines.push("", `### ${flow.title}`, "", flow.description, "", `**${flow.status} · ${flow.category} · ${flow.screenCount} screens**`);
      if (flow.steps.length) lines.push("", ...[...flow.steps].sort((a, b) => a.order - b.order).map((step, index) => `${index + 1}. ${step.label}`));
    }
  }
  if (artifact.screens.length) {
    lines.push("", "## Screens");
    for (const screen of artifact.screens) {
      lines.push("", `### ${screen.title}`, "", screen.description);
      if (screen.keyElements.length) lines.push("", "**Key elements**", "", ...list(screen.keyElements));
    }
  }
  if (artifact.figjamUrl) lines.push("", `[Open FigJam flow](${artifact.figjamUrl})`);
  return document(artifact.title, lines);
}

export function wireframesMarkdown(artifact: WireframesArtifact) {
  const lines = ["", "**Fidelity:** Lo-Fi"];
  if (artifact.generatedScreens.length) lines.push("", "## Generated screens");
  for (const screen of artifact.generatedScreens) {
    lines.push("", `### ${screen.title} · ${screen.priority}`);
    if (screen.goal) lines.push("", screen.goal);
    for (const section of screen.sections) {
      lines.push("", `#### ${section.title}`);
      for (const block of section.blocks) {
        lines.push("", `- **${block.kind}:** ${block.intent}`);
        if (block.copySlots) {
          lines.push(...Object.entries(block.copySlots).map(([slot, copy]) => `  - **${slot}:** ${copy}`));
        }
        if (block.notes) lines.push(`  - ${block.notes}`);
      }
    }
  }
  return document(artifact.title, lines);
}

export function assetsMarkdown(
  artifact: AssetsArtifact | null | undefined,
  uploadedAssets: UploadedAsset[],
  assetPathByUrl: AssetPathMap,
) {
  const lines: string[] = [];
  if (artifact?.wireframes.length) {
    lines.push("", "## Wireframes", "", ...artifact.wireframes.map((item) =>
      `- **${item.title}** — ${item.type}, ${item.priority}${item.figmaUrl ? ` · [Open in Figma](${item.figmaUrl})` : ""}`,
    ));
  }
  if (artifact?.documents.length) {
    lines.push("", "## Documents", "", ...artifact.documents.map((item) =>
      `- **${item.title}** — ${item.description}`,
    ));
  }
  if (uploadedAssets.length) {
    lines.push("", "## Uploaded files", "", ...uploadedAssets.map((item) => {
      const path = item.url ? assetPathByUrl.get(item.url) : undefined;
      return path ? `- [${item.title}](./${path})` : `- ${item.title} — source file unavailable`;
    }));
  }
  return document(artifact?.title ?? "Assets", lines);
}
