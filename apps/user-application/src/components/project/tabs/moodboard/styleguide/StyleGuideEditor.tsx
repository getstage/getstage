import { useMemo, useState, type ReactNode } from "react";
import { useQuery } from "convex/react";
import type { MoodboardStyleGuide } from "@stage/data-ops/contracts";
import { useStyleGuideEditor, type StyleGuideSaveState } from "@/hooks/project/moodboard/useStyleGuideEditor";
import { useStyleGuideFontUpload } from "@/hooks/project/moodboard/useStyleGuideFontUpload";
import { useRoomPresence, type RoomMember } from "@/hooks/project/useRoomPresence";
import { api } from "@/lib/convexApi";
import { resolveStyleGuideSpec } from "@stage/data-ops/domain/styleGuideSpec";
import type { ThemeMode } from "@stage/project-ui/moodboard/styleGuideSpec";
import type { MoodboardItem } from "@stage/project-ui/moodboard/types";
import { cn } from "@/lib/utils";
import { AdvancedSection } from "./AdvancedSection";
import { ColorsSection, FontsSection, IntentSection, ReferencesSection, RulesSection, ShapeSection } from "./sections";
import { Divider } from "@stage/project-ui/moodboard/styleguide/fields";
import { HeaderButton, StyleGuideDialog } from "@stage/project-ui/moodboard/styleguide/StyleGuideDialog";

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
  const uploadFont = useStyleGuideFontUpload(projectId);
  const section = { spec, update };
  const fontSection = { ...section, uploadFont };

  const sections = [
    ["intent", <IntentSection {...section} />],
    ["references", <ReferencesSection {...section} images={references} />],
    ["colors", <ColorsSection {...section} mode={mode} onModeChange={setMode} />],
    ["fonts", <FontsSection {...fontSection} />],
    ["shape", <ShapeSection {...section} />],
    ["rules", <RulesSection {...section} />],
    ["advanced", <AdvancedSection {...fontSection} />],
  ] as const;

  return (
    <StyleGuideDialog
      spec={spec}
      references={references}
      mode={mode}
      onModeChange={setMode}
      onBack={onBack}
      headerControls={
        <>
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
        </>
      }
      editor={sections.map(([id, node], index) => (
        <div key={id} className="flex flex-col gap-8">
          {index > 0 ? <Divider /> : null}
          <Focusable id={id} members={others} onFocus={setFocus}>{node}</Focusable>
        </div>
      ))}
    />
  );
}
