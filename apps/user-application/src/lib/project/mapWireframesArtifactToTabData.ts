import {
  wireframesArtifactSchema,
  type WireframeConfigureScreen,
  type WireframesArtifact,
} from "@stage/data-ops/contracts";
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

/**
 * The artifact with the user's curated screen list written back. Only the list and
 * its count change: generated screens stay whatever the engine produced, so editing
 * the list never claims a screen has been generated.
 */
export function withConfigureScreens(
  artifact: WireframesArtifact,
  screens: ScreenItem[],
): WireframesArtifact {
  const configureScreens = screens.map(mapScreenItemToConfigureScreen);

  return wireframesArtifactSchema.parse({
    ...artifact,
    configureScreens,
    stats: {
      ...artifact.stats,
      totalConfigureScreenCount: configureScreens.length,
    },
  });
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

export function buildResultCards(
  screens: ScreenItem[],
  generatedAtLabel: string,
  limit = 6,
  generatedScreens: WireframeGeneratedScreen[] = [],
  generatedAt?: number,
): WireframeResultCard[] {
  const generatedById = new Map(generatedScreens.map((screen) => [screen.id, screen]));
  // `selected` is the scope of the NEXT run, not what exists. Once anything has
  // been generated the grid shows the generated screens; before the first run it
  // previews the pending selection.
  const visibleScreens =
    generatedScreens.length > 0
      ? screens.filter((screen) => generatedById.has(screen.id))
      : screens.filter((screen) => screen.selected);

  return visibleScreens
    .slice(0, limit)
    .map((screen) => {
      const generated = generatedById.get(screen.id);
      return {
        ...screen,
        date: generated?.generatedAtLabel ?? generatedAtLabel,
        // Per-screen timestamp so a partial regen only bumps the regenerated
        // cards; fall back to the artifact time, then to the `date` label string
        // (via WireframeCard) when neither numeric time exists.
        generatedAt: generated?.generatedAt ?? generatedAt,
        goal: generated?.goal,
        sections: generated?.sections,
        html: generated?.html,
        figmaUrl: generated?.figmaUrl,
      };
    });
}
