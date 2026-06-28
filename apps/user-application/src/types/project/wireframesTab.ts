export type WireframeKind = "lofi" | "hifi";
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
  figmaUrl?: string;
  goal?: string;
  sections?: WireframeRenderableSection[];
  // Hi-Fi source of truth: a self-contained HTML fragment rendering this screen
  // as a final design. Absent for Lo-Fi (block-only) screens.
  html?: string;
};

export type WireframesTabData = {
  wireframeKind: WireframeKind;
  brandSource: "style-guide" | "brand-kit" | null;
  styleDirectionId: string | null;
  configureScreens: ScreenItem[];
  stats: WireframesTabStats;
  brandKit: WireframesBrandKit | null;
  generatedAt: number;
  generatedAtLabel: string;
  figmaSymbolUrl: string;
  generatedScreens: WireframeGeneratedScreen[];
};
