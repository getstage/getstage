import type { ProjectScreen } from "./model";
import { ScreenCard } from "./ScreenCard";

// Stage for Mac passes `edit` to edit key elements; the web shows the screens read-only.
export type ScreensPanelEdit = {
  editingScreenId: string | null;
  draftScreenElements: Record<string, string[]>;
  onBeginEdit: (screen: ProjectScreen) => void;
  onDraftElementChange: (screenId: string, elementIndex: number, value: string) => void;
  onRegenerate: (screen: ProjectScreen) => void;
  regenerating: boolean;
  onDiscard: (screenId: string) => void;
  onSave: (screenId: string) => void;
};

export function ScreensPanel({ screens, edit }: { screens: ProjectScreen[]; edit?: ScreensPanelEdit }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="grid grid-cols-1 gap-1 xl:grid-cols-2">
        {screens.map((screen) => (
          <ScreenCard
            key={screen.id}
            screen={screen}
            edit={edit && {
              editing: edit.editingScreenId === screen.id,
              draftElements: edit.draftScreenElements[screen.id] ?? screen.keyElements,
              onBeginEdit: () => edit.onBeginEdit(screen),
              onDraftElementChange: (elementIndex, value) => edit.onDraftElementChange(screen.id, elementIndex, value),
              onRegenerate: () => edit.onRegenerate(screen),
              regenerating: edit.regenerating,
              onDiscard: () => edit.onDiscard(screen.id),
              onSave: () => edit.onSave(screen.id),
            }}
          />
        ))}
      </div>
    </div>
  );
}
