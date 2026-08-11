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

export function mapWireframesArtifactToTabData(
  artifact: WireframesArtifact,
  css: string | null = null,
): WireframesTabData {
  return {
    wireframeKind: artifact.wireframeKind,
    viewport: artifact.viewport,
    frameWidth: artifact.frameWidth,
    brandSource: artifact.brandSource ?? null,
    styleDirectionId: artifact.styleDirectionId ?? null,
    configureScreens: artifact.configureScreens.map(mapConfigureScreenToScreenItem),
    stats: artifact.stats,
    brandKit: artifact.brandKit ?? null,
    generatedAt: artifact.generatedAt,
    generatedAtLabel: artifact.generatedAtLabel,
    figmaSymbolUrl: artifact.figmaSymbolUrl,
    css,
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
      liveUrl: screen.liveUrl,
      renderMode: screen.renderMode,
    })),
  };
}

export type WireframeResultCard = ScreenItem & {
  date: string;
  generatedAt?: number;
  goal?: string;
  sections?: WireframeGeneratedScreen["sections"];
  html?: string;
  /** Resolved R2 URL of the interactive React build, loaded live in a sandboxed iframe. */
  liveUrl?: string;
  /** How `html` was produced. Defaulted by the contract, so it is always set. */
  renderMode: WireframeGeneratedScreen["renderMode"];
  figmaUrl?: string;
};

export function buildResultCards(
  screens: ScreenItem[],
  generatedAtLabel: string,
  generatedScreens: WireframeGeneratedScreen[] = [],
  generatedAt?: number,
): WireframeResultCard[] {
  const generatedById = new Map(generatedScreens.map((screen) => [screen.id, screen]));
  // `selected` is the scope of the NEXT run, not what exists. Once anything has
  // been generated the grid shows every generated screen; before the first run it
  // previews the pending selection. There is no preview cutoff — a 17-screen run
  // must show all 17 cards.
  const visibleScreens =
    generatedScreens.length > 0
      ? screens.filter((screen) => generatedById.has(screen.id))
      : screens.filter((screen) => screen.selected);

  return visibleScreens.map((screen) => {
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
      // A screen with no generated entry has no HTML at all, so "fallback" is the
      // honest reading: nothing came out of the React renderer for it.
      renderMode: generated?.renderMode ?? "html-fallback",
      liveUrl: generated?.liveUrl,
      figmaUrl: generated?.figmaUrl,
    };
  });
}
