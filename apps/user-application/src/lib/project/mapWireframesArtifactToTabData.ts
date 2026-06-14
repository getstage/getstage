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
      figmaUrl: screen.figmaUrl,
      goal: screen.goal,
      sections: screen.sections,
    })),
  };
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
  const generatedById = new Map(generatedScreens.map((screen) => [screen.id, screen]));

  return screens
    .filter((screen) => screen.selected)
    .slice(0, limit)
    .map((screen) => {
      const generated = generatedById.get(screen.id);
      return {
        ...screen,
        date: generated?.generatedAtLabel ?? generatedAtLabel,
        generatedAt,
        goal: generated?.goal,
        sections: generated?.sections,
        figmaUrl: generated?.figmaUrl,
      };
    });
}
