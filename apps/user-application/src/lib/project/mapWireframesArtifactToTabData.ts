import type { WireframeConfigureScreen, WireframesArtifact } from "@stage/data-ops/contracts";
import type {
  ScreenItem,
  WireframeGeneratedScreen,
  WireframesTabData,
} from "@/types/project/wireframesTab";

export function mapConfigureScreenToScreenItem(screen: WireframeConfigureScreen): ScreenItem {
  return {
    id: screen.id,
    title: screen.title,
    description: screen.description,
    kind: screen.kind,
    priority: screen.priority,
    required: screen.required,
    selected: screen.selected,
  };
}

export function mapScreenItemToConfigureScreen(screen: ScreenItem): WireframeConfigureScreen {
  return {
    id: screen.id,
    title: screen.title,
    description: screen.description,
    kind: screen.kind,
    priority: screen.priority,
    required: screen.required,
    selected: screen.selected,
  };
}

export function mapWireframesArtifactToTabData(artifact: WireframesArtifact): WireframesTabData {
  return {
    wireframeKind: artifact.wireframeKind,
    brandSource: artifact.brandSource ?? null,
    styleDirectionId: artifact.styleDirectionId ?? null,
    configureScreens: artifact.configureScreens.map(mapConfigureScreenToScreenItem),
    stats: artifact.stats,
    brandKit: artifact.brandKit ?? null,
    generatedAt: artifact.generatedAt,
    generatedAtLabel: artifact.generatedAtLabel,
    figmaSymbolUrl: artifact.figmaSymbolUrl,
    generatedScreens: artifact.generatedScreens.map((screen) => ({
      id: screen.id,
      title: screen.title,
      priority: screen.priority,
      generatedAtLabel: screen.generatedAtLabel,
      generatedAt: screen.generatedAt,
      figmaUrl: screen.figmaUrl,
      goal: screen.goal,
      sections: screen.sections,
    })),
  };
}

export function hasLofiBlocks(
  screen: Pick<WireframeGeneratedScreen, "sections">,
): boolean {
  return Boolean(screen.sections?.some((section) => (section.blocks?.length ?? 0) > 0));
}

export function hasDisplayableWireframeResults(
  tabData: WireframesTabData | undefined | null,
): boolean {
  if (!tabData) {
    return false;
  }
  return tabData.wireframeKind === "lofi" && tabData.generatedScreens.some(hasLofiBlocks);
}

export type WireframeResultCard = ScreenItem & {
  date: string;
  generatedAt?: number;
  goal?: string;
  sections?: WireframeGeneratedScreen["sections"];
  figmaUrl?: string;
};

export function buildResultCards(
  screens: ScreenItem[],
  generatedAtLabel: string,
  limit = 6,
  generatedScreens: WireframeGeneratedScreen[] = [],
  generatedAt?: number,
): WireframeResultCard[] {
  const configureById = new Map(screens.map((screen) => [screen.id, screen]));

  return generatedScreens
    .filter(hasLofiBlocks)
    .slice(0, limit)
    .map((generated) => {
      const configure = configureById.get(generated.id);
      return {
        id: generated.id,
        title: generated.title || configure?.title || generated.id,
        description: configure?.description ?? "",
        kind: configure?.kind ?? "Page",
        priority: generated.priority || configure?.priority || "P0",
        required: configure?.required ?? false,
        selected: true,
        date: generated.generatedAtLabel ?? generatedAtLabel,
        generatedAt: generated.generatedAt ?? generatedAt,
        goal: generated.goal,
        sections: generated.sections,
        figmaUrl: generated.figmaUrl,
      };
    });
}
