import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "convex/react";
import type { MoodboardStyleGuide } from "@stage/data-ops/contracts";
import { useStyleGuideEditor, type StyleGuideSaveState } from "@/hooks/project/moodboard/useStyleGuideEditor";
import { useRoomPresence, type RoomMember } from "@/hooks/project/useRoomPresence";
import { api } from "@/lib/convexApi";
import { resolveStyleGuideSpec, styleGuideDesignMarkdown, type ThemeMode } from "@/lib/project/styleGuideSpec";
import type { MoodboardItem } from "@/types/project/moodboardTab";
import { cn } from "@/lib/utils";
import { AdvancedSection } from "./AdvancedSection";
import { ColorsSection, FontsSection, IntentSection, MODES, ReferencesSection, RulesSection, ShapeSection } from "./sections";
import { Divider, Icon, Segmented } from "./fields";
import { StyleGuidePreview } from "./StyleGuidePreview";

type Props = {
  projectId: string;
  directionId: string;
  directionName: string;
  guide: MoodboardStyleGuide;
  references: MoodboardItem[];
  onBack: () => void;
  onRegenerateAll: () => void;
};

const SAVE_LABEL: Record<StyleGuideSaveState["kind"], string> = {
  saved: "All changes saved",
  saving: "Saving…",
  failed: "Not saved",
};

function downloadDesignMarkdown(name: string, markdown: string) {
  const url = URL.createObjectURL(new Blob([markdown], { type: "text/markdown" }));
  const link = Object.assign(document.createElement("a"), { href: url, download: `${name || "style-guide"}-DESIGN.md` });
  link.click();
  URL.revokeObjectURL(url);
}

function Avatars({ members, size = 24 }: { members: RoomMember[]; size?: number }) {
  return (
    <span className="flex -space-x-1.5">
      {members.map((member) => (
        <span
          key={member.userId}
          title={member.name}
          style={{ width: size, height: size }}
          className="flex items-center justify-center overflow-hidden rounded-full border-2 border-white bg-accent-light text-[10px] font-medium text-accent"
        >
          {member.image ? <img src={member.image} alt={member.name} className="size-full object-cover" /> : member.name.slice(0, 1)}
        </span>
      ))}
    </span>
  );
}

// Each section reports focus so teammates see who is working where.
function Focusable({ id, members, onFocus, children }: { id: string; members: RoomMember[]; onFocus: (id: string) => void; children: ReactNode }) {
  const here = members.filter((member) => member.focus === id);
  return (
    <div className="relative" onFocusCapture={() => onFocus(id)} onPointerDownCapture={() => onFocus(id)}>
      {here.length ? (
        <span className="absolute top-0 -right-6 translate-x-full">
          <Avatars members={here} size={28} />
        </span>
      ) : null}
      {children}
    </div>
  );
}

export function StyleGuideEditor(props: Props) {
  const viewer = useQuery(api.viewer.getIdentity);
  if (viewer === undefined) return null;
  return <StyleGuideEditorView {...props} userId={viewer?.id} />;
}

function StyleGuideEditorView({ projectId, directionId, directionName, guide, references, onBack, onRegenerateAll, userId }: Props & { userId?: string }) {
  const serverSpec = useMemo(() => resolveStyleGuideSpec(guide, directionName, references), [guide, directionName, references]);
  const { spec, update, resetToGenerated, saveState } = useStyleGuideEditor(projectId, directionId, serverSpec);
  const { others, setFocus } = useRoomPresence(`styleguide:${projectId}:${directionId}`, userId);
  const [mode, setMode] = useState<ThemeMode>(spec.layout.theme);
  const [tab, setTab] = useState<"screen" | "markdown">("screen");
  const markdown = useMemo(() => styleGuideDesignMarkdown(spec, references), [spec, references]);
  const section = { spec, update };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onBack();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onBack]);

  const sections = [
    ["intent", <IntentSection {...section} />],
    ["references", <ReferencesSection {...section} images={references} />],
    ["colors", <ColorsSection {...section} mode={mode} onModeChange={setMode} />],
    ["fonts", <FontsSection {...section} />],
    ["shape", <ShapeSection {...section} />],
    ["rules", <RulesSection {...section} />],
    ["advanced", <AdvancedSection {...section} />],
  ] as const;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${spec.intent.name} style guide`}
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/10 p-4 backdrop-blur-[5px]"
      onMouseDown={(event) => event.target === event.currentTarget && onBack()}
    >
      <div className="flex h-full max-h-[894px] w-full max-w-[1306px] flex-col overflow-hidden rounded-[12px] border-[0.5px] border-neutral-300 bg-neutral-100 p-1 shadow-stage-control">
        <header className="flex flex-wrap items-center justify-between gap-2 p-3">
          <div className="flex min-w-0 flex-col font-medium leading-[1.5]">
            <h2 className="truncate text-[15px] text-neutral-950">{spec.intent.name} — Style Guide</h2>
            {spec.intent.line ? <p className="truncate text-[13px] text-neutral-600">{spec.intent.line}</p> : null}
          </div>
          <div className="flex flex-wrap items-center gap-1 py-[3px] text-[13px] font-medium">
            <Avatars members={others} />
            <span
              role="status"
              title={saveState.kind === "failed" ? saveState.message : undefined}
              className={cn("px-2.5 py-[5px]", saveState.kind === "failed" ? "text-red-500" : "text-neutral-400")}
            >
              {SAVE_LABEL[saveState.kind]}
            </span>
            <button type="button" onClick={resetToGenerated} className="px-2.5 py-[5px] text-red-500 hover:opacity-80">
              Reset to generated
            </button>
            <HeaderButton icon="regenerate-all" onClick={onRegenerateAll}>Regenerate All</HeaderButton>
            <HeaderButton icon="export" onClick={() => downloadDesignMarkdown(spec.intent.name, markdown)}>Export</HeaderButton>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 gap-6 rounded-[8px] border-[0.5px] border-neutral-300 bg-white p-3 shadow-stage-control">
          <div className="flex w-[clamp(340px,48%,613px)] shrink-0 flex-col gap-8 overflow-y-auto pr-8">
            {sections.map(([id, node], index) => (
              <div key={id} className="flex flex-col gap-8">
                {index > 0 ? <Divider /> : null}
                <Focusable id={id} members={others} onFocus={setFocus}>{node}</Focusable>
              </div>
            ))}
          </div>

          <div className="w-0 self-stretch border-l-[0.5px] border-neutral-300" />

          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <Segmented
                label="Preview"
                fit
                value={tab}
                options={[{ value: "screen", label: "Screen" }, { value: "markdown", label: "DESIGN.md" }]}
                onChange={setTab}
              />
              {tab === "screen" ? <Segmented label="Preview mode" fit value={mode} options={MODES} onChange={setMode} /> : null}
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

function HeaderButton({ icon, onClick, children }: { icon: string; onClick: () => void; children: ReactNode }) {
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
