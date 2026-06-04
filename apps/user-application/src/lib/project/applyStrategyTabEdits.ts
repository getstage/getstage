import {
  strategyArtifactSchema,
  type StrategyArtifact,
  type StrategyBox,
  type StrategyCard,
  type StrategyPrinciple,
  type StrategySection,
} from "@stage/data-ops/contracts";
import type { StrategyTabData } from "@/types/project/strategyTab";

function requiredText(value: string, fallback: string) {
  const trimmed = value.trim();
  return trimmed || fallback;
}

function optionalText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function cleanBody(body: string[] | undefined, fallback: string) {
  const next = (body ?? []).map((line) => line.trim()).filter(Boolean);
  return next.length > 0 ? next : [fallback];
}

function cleanPrinciples(principles: StrategyPrinciple[] | undefined): StrategyPrinciple[] {
  const next = (principles ?? [])
    .map((principle, index) => ({
      title: requiredText(principle.title, `Principle ${index + 1}`),
      body: requiredText(principle.body, "Not specified."),
      research: optionalText(principle.research),
    }))
    .filter((principle) => principle.title && principle.body);

  return next.length > 0
    ? next
    : [{ title: "Principle 1", body: "Not specified." }];
}

function cleanTable(table: [string, string][] | undefined): [string, string][] {
  const next = (table ?? [])
    .map(([label, value], index) => [
      requiredText(label, `Row ${index + 1}`),
      requiredText(value, "Not specified."),
    ] as [string, string])
    .filter(([label, value]) => Boolean(label && value));

  return next.length > 0 ? next : [["Detail", "Not specified."]];
}

function cleanCards(cards: StrategyCard[] | undefined): StrategyCard[] {
  const next = (cards ?? [])
    .map((card, index) => ({
      title: requiredText(card.title, `Card ${index + 1}`),
      objective: requiredText(card.objective, "Not specified."),
      kpi: requiredText(card.kpi, "Not specified."),
      keyElement: requiredText(card.keyElement, "Not specified."),
    }))
    .filter((card) => Boolean(card.title));

  return next.length > 0
    ? next
    : [
        {
          title: "Card 1",
          objective: "Not specified.",
          kpi: "Not specified.",
          keyElement: "Not specified.",
        },
      ];
}

function cleanBoxes(boxes: StrategyBox[] | undefined): StrategyBox[] {
  const next = (boxes ?? [])
    .map((box, index) => ({
      title: requiredText(box.title, `Box ${index + 1}`),
      bullets: cleanBody(box.bullets, "Not specified."),
    }))
    .filter((box) => Boolean(box.title));

  return next.length > 0 ? next : [{ title: "Box 1", bullets: ["Not specified."] }];
}

function cleanSection(section: StrategySection, index: number): StrategySection {
  const base = {
    id: requiredText(section.id, `custom-section-${index + 1}`),
    title: requiredText(section.title, `Section ${index + 1}`),
    emoji: optionalText(section.emoji),
    status: section.status === "approved" ? "approved" : "action",
    kind: section.kind,
  } as const;

  switch (section.kind) {
    case "plain":
    case "paragraph":
      return { ...base, body: cleanBody(section.body, "Not specified.") };
    case "principles":
      return { ...base, principles: cleanPrinciples(section.principles) };
    case "table":
      return { ...base, table: cleanTable(section.table) };
    case "cards":
      return { ...base, cards: cleanCards(section.cards) };
    case "boxes":
      return { ...base, boxes: cleanBoxes(section.boxes) };
    default:
      return { ...base, body: cleanBody(section.body, "Not specified.") };
  }
}

export function applyStrategyTabEdits(
  artifact: StrategyArtifact,
  tabData: StrategyTabData,
): StrategyArtifact {
  return strategyArtifactSchema.parse({
    ...artifact,
    sections: tabData.sections.map(cleanSection),
    generatedAt: Date.now(),
  });
}

export function summarizeStrategyArtifact(artifact: StrategyArtifact) {
  const approved = artifact.sections.filter((section) => section.status === "approved").length;
  const action = artifact.sections.length - approved;
  return `${artifact.sections.length} sections, ${approved} approved, ${action} action required.`;
}
