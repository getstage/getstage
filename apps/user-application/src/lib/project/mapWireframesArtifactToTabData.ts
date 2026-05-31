import type { WireframeConfigureScreen, WireframesArtifact } from "@stage/data-ops/contracts";
import type { ScreenItem, WireframesTabData } from "@/types/project/wireframesTab";

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
    configureScreens: artifact.configureScreens.map(mapConfigureScreenToScreenItem),
    stats: artifact.stats,
    brandKit: artifact.brandKit ?? null,
    generatedAtLabel: artifact.generatedAtLabel,
    figmaSymbolUrl: artifact.figmaSymbolUrl,
    generatedScreens: artifact.generatedScreens,
  };
}

export function buildResultCards(
  screens: ScreenItem[],
  generatedAtLabel: string,
  limit = 6,
): Array<ScreenItem & { date: string }> {
  return screens
    .filter((screen) => screen.selected)
    .slice(0, limit)
    .map((screen) => ({
      ...screen,
      date: generatedAtLabel,
    }));
}
