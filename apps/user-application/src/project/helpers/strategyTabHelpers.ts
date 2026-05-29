import type { StrategySection } from "../models/strategyTab";

export function cloneSections(sections: StrategySection[]) {
  return sections.map((section) => ({
    ...section,
    body: section.body ? [...section.body] : undefined,
    principles: section.principles ? section.principles.map((principle) => ({ ...principle })) : undefined,
    table: section.table ? section.table.map(([label, value]) => [label, value] as [string, string]) : undefined,
    cards: section.cards ? section.cards.map((card) => ({ ...card })) : undefined,
    boxes: section.boxes ? section.boxes.map((box) => ({ ...box, bullets: [...box.bullets] })) : undefined,
  }));
}

export function appendRegeneratedText(section: StrategySection): StrategySection {
  if (section.body) {
    return { ...section, body: [...section.body, "Regenerated mock update."] };
  }

  return { ...section, body: ["Regenerated mock update."] };
}
