import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { StyleGuideSpec } from "@stage/data-ops/contracts";
import { ensureStyleGuideFonts } from "../../fonts/uploadedFonts";
import { styleGuideDesignMarkdown } from "@stage/data-ops/domain/styleGuideSpec";
import type { ThemeMode } from "../styleGuideSpec";
import type { MoodboardItem } from "../types";
import { Icon, Segmented } from "./fields";
import { StyleGuidePreview } from "./StyleGuidePreview";

export const MODES = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
] as const;

function downloadDesignMarkdown(name: string, markdown: string) {
  const url = URL.createObjectURL(new Blob([markdown], { type: "text/markdown" }));
  const link = Object.assign(document.createElement("a"), { href: url, download: `${name || "style-guide"}-DESIGN.md` });
  link.click();
  URL.revokeObjectURL(url);
}

// A direction's style guide: the live preview (Screen / DESIGN.md, light or dark) and Export.
// Stage for Mac adds its editor on the left and its own header controls; the web shows the preview only.
export function StyleGuideDialog({ spec, references, mode, onModeChange, onBack, headerControls, editor }: {
  spec: StyleGuideSpec;
  references: MoodboardItem[];
  mode: ThemeMode;
  onModeChange: (mode: ThemeMode) => void;
  onBack: () => void;
  headerControls?: ReactNode;
  editor?: ReactNode;
}) {
  const [tab, setTab] = useState<"screen" | "markdown">("screen");
  const markdown = useMemo(() => styleGuideDesignMarkdown(spec, references), [spec, references]);

  useEffect(() => ensureStyleGuideFonts(spec.fonts), [spec.fonts]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onBack();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onBack]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${spec.intent.name} style guide`}
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/10 px-[clamp(16px,4.6vw,67px)] py-[clamp(16px,6vh,65px)] backdrop-blur-[5px]"
      onMouseDown={(event) => event.target === event.currentTarget && onBack()}
    >
      <div className="flex h-full max-h-[894px] w-full max-w-[1306px] flex-col overflow-hidden rounded-[12px] border-[0.5px] border-neutral-300 bg-neutral-100 p-1 shadow-stage-control">
        <header className="flex flex-wrap items-center justify-between gap-2 p-3">
          <div className="flex min-w-0 flex-col font-medium leading-[1.5]">
            <h2 className="truncate text-[15px] text-neutral-950">{spec.intent.name} — Style Guide</h2>
            {spec.intent.line ? <p className="truncate text-[13px] text-neutral-600">{spec.intent.line}</p> : null}
          </div>
          <div className="flex flex-wrap items-center gap-1 py-[3px] text-[13px] font-medium">
            {headerControls}
            <HeaderButton icon="export" onClick={() => downloadDesignMarkdown(spec.intent.name, markdown)}>Export</HeaderButton>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 gap-6 rounded-[8px] border-[0.5px] border-neutral-300 bg-white p-3 shadow-stage-control">
          {editor ? (
            <>
              <div className="flex w-[clamp(340px,48%,613px)] shrink-0 flex-col gap-8 overflow-y-auto pr-8">{editor}</div>
              <div className="w-0 self-stretch border-l-[0.5px] border-neutral-300" />
            </>
          ) : null}

          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <Segmented
                label="Preview"
                fit
                value={tab}
                options={[{ value: "screen", label: "Screen" }, { value: "markdown", label: "DESIGN.md" }]}
                onChange={setTab}
              />
              {tab === "screen" ? <Segmented label="Preview mode" fit value={mode} options={MODES} onChange={onModeChange} /> : null}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto rounded-[8px] bg-neutral-100 p-3 shadow-stage-field">
              {tab === "screen" ? (
                <StyleGuidePreview spec={spec} mode={mode} />
              ) : (
                <pre className="font-mono text-[12px] whitespace-pre-wrap text-neutral-800">{markdown}</pre>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function HeaderButton({ icon, onClick, children }: { icon: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-[6px] border-[0.5px] border-neutral-300 bg-neutral-200 py-[5px] pr-2.5 pl-[9px] text-neutral-700 hover:bg-neutral-300/60"
    >
      <Icon name={icon} /> {children}
    </button>
  );
}
