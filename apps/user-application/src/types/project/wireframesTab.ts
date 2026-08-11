export type WireframeKind = "lofi" | "hifi";
export type WireframeRenderMode = "react" | "html-fallback";
export type WireframeViewport = "mobile" | "desktop";
export type WireframeKindChoice = WireframeKind | null;
export type WireframeStep =
  | "choose-kind"
  | "choose-type"
  | "style-guide"
  | "brand-kit"
  | "configure"
  | "generating"
  | "results";

export type ScreenItem = {
  id: string;
  title: string;
  description: string;
  kind: "Page" | "Section";
  priority: string;
  required: boolean;
  selected: boolean;
};

export type WireframesTabStats = {
  flowsScreenCount: number;
  moodboardPatternCount: number;
  totalConfigureScreenCount: number;
};

export type WireframesBrandKit = {
  fileName: string;
  sizeBytes: number;
  fileSizeLabel: string;
};

export type WireframeBlockEmphasis = "primary" | "secondary" | "tertiary";

export type WireframeRenderableBlock = {
  id: string;
  kind: string;
  intent: string;
  emphasis: WireframeBlockEmphasis;
  copySlots?: Record<string, string>;
  notes?: string;
};

export type WireframeRenderableSection = {
  id: string;
  title: string;
  blocks: WireframeRenderableBlock[];
};

export type WireframeGeneratedScreen = {
  id: string;
  title: string;
  priority: string;
  generatedAtLabel: string;
  // Numeric ms timestamp for this specific screen. Partial regen only refreshes
  // the regenerated screens, so cards render honest per-screen times. Optional
  // for legacy artifacts that predate per-screen timestamps.
  generatedAt?: number;
  figmaUrl?: string;
  goal?: string;
  sections?: WireframeRenderableSection[];
  // Hi-Fi source of truth: a self-contained HTML fragment rendering this screen
  // as a final design. Absent for Lo-Fi (block-only) screens.
  html?: string;
  // The interactive React build (React + motion). A resolved R2 URL at read time; the
  // live preview loads it in a sandboxed iframe. Absent for fallback/Lo-Fi screens.
  liveUrl?: string;
  // How that HTML was produced. The React renderer falls back silently, so without
  // this a screen built from the selected component libraries is indistinguishable
  // from one the model hand-wrote. Screens predating the renderer are all fallbacks.
  renderMode: WireframeRenderMode;
};

export type WireframesTabData = {
  wireframeKind: WireframeKind;
  /** The frame this run was designed for, derived by the engine from the project type. */
  viewport: WireframeViewport;
  frameWidth: number;
  brandSource: "style-guide" | "brand-kit" | null;
  styleDirectionId: string | null;
  configureScreens: ScreenItem[];
  stats: WireframesTabStats;
  brandKit: WireframesBrandKit | null;
  generatedAt: number;
  generatedAtLabel: string;
  figmaSymbolUrl: string;
  // The run's shared stylesheet text (resolved from R2 by useWireframesArtifact).
  // Null for Lo-Fi runs and pre-offload artifacts.
  css: string | null;
  generatedScreens: WireframeGeneratedScreen[];
};
