import { useEffect, useRef, useState } from "react";
import type { StyleGuideSpec } from "@stage/data-ops/contracts";
import { shadcnThemeVars, type ThemeMode } from "@/lib/project/styleGuideSpec";
import { ExampleScreen } from "./preview/ExampleScreen";
import { Gallery } from "./preview/Gallery";
import { Specimen } from "./preview/Specimen";

// The concept screen is laid out at a desktop width between 720 and 1080px and
// scaled to fit the panel: wide panels show it at full size, narrow ones reflow to
// fewer columns rather than shrinking text past ~64%.
const MIN_WIDTH = 720;
const MAX_WIDTH = 1080;
const MIN_SCALE = 0.8;

function useFitLayout() {
  const ref = useRef<HTMLDivElement>(null);
  const [panelWidth, setPanelWidth] = useState(MAX_WIDTH);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setPanelWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const width = Math.round(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, panelWidth / MIN_SCALE)));
  return { ref, width, scale: Math.min(1, panelWidth / width) };
}

// The Direction rendered with real shadcn/ui components, themed by the guide's CSS
// variables so every edit recolours and reshapes it live.
export function StyleGuidePreview({ spec, mode }: { spec: StyleGuideSpec; mode: ThemeMode }) {
  const { ref, width, scale } = useFitLayout();
  return (
    <div ref={ref}>
      <div
        style={{ ...shadcnThemeVars(spec, mode), width, zoom: scale }}
        className="@container flex flex-col gap-[calc(48px*var(--sg-space))] rounded-[10px] bg-sg-background p-[calc(40px*var(--sg-space))] font-[family-name:var(--sg-font-body)] text-[calc(14px*var(--sg-font-scale))] text-sg-foreground"
      >
        <Specimen spec={spec} mode={mode} />
        <Gallery />
        <ExampleScreen />
      </div>
    </div>
  );
}
