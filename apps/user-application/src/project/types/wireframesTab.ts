export type WireframeKind = "lofi" | "hifi";
export type WireframeKindChoice = WireframeKind | null;
export type WireframeStep = "choose-kind" | "choose-type" | "style-guide" | "brand-kit" | "configure" | "generating" | "results";

export type ScreenItem = {
  id: string;
  title: string;
  description: string;
  kind: "Page" | "Section";
  priority: string;
  required: boolean;
  selected: boolean;
};
