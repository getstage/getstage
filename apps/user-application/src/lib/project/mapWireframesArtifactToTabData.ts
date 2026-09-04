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
      html: screen.html,
    })),
  };
}

export type WireframeResultCard = ScreenItem & {
  date: string;
  generatedAt?: number;
  goal?: string;
  sections?: WireframeGeneratedScreen["sections"];
  html?: string;
  figmaUrl?: string;
};

export function hasRenderableWireframeOutput(screen: WireframeGeneratedScreen): boolean {
  return Boolean(
    screen.html?.trim() ||
      screen.sections?.some((section) => (section.blocks?.length ?? 0) > 0),
  );
}

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
    .flatMap((screen) => {
      const generated = generatedById.get(screen.id);
      if (!generated || !hasRenderableWireframeOutput(generated)) {
        return [];
      }

      return [{
        ...screen,
        date: generated.generatedAtLabel ?? generatedAtLabel,
        // Per-screen timestamp so a partial regen only bumps the regenerated
        // cards; fall back to the artifact time, then to the `date` label string
        // (via WireframeCard) when neither numeric time exists.
        generatedAt: generated.generatedAt ?? generatedAt,
        goal: generated.goal,
        sections: generated.sections,
        html: generated.html,
        figmaUrl: generated.figmaUrl,
      }];
    })
    .slice(0, limit);
}
