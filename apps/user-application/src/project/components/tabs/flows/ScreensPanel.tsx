import type { ProjectScreen } from "../../../models/project";
import { ScreenCard } from "./ScreenCard";

export function ScreensPanel({
  screens,
  editingScreenId,
  draftScreenElements,
  onBeginEdit,
  onDraftElementChange,
  onDiscard,
  onSave,
}: {
  screens: ProjectScreen[];
  editingScreenId: string | null;
  draftScreenElements: Record<string, string[]>;
  onBeginEdit: (screen: ProjectScreen) => void;
  onDraftElementChange: (screenId: string, elementIndex: number, value: string) => void;
  onDiscard: (screenId: string) => void;
  onSave: (screenId: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="grid grid-cols-1 gap-1 xl:grid-cols-2">
        {screens.map((screen) => (
          <ScreenCard
            key={screen.id}
            screen={screen}
            editing={editingScreenId === screen.id}
            draftElements={draftScreenElements[screen.id] ?? screen.keyElements}
            onBeginEdit={() => onBeginEdit(screen)}
            onDraftElementChange={(elementIndex, value) => onDraftElementChange(screen.id, elementIndex, value)}
            onDiscard={() => onDiscard(screen.id)}
            onSave={() => onSave(screen.id)}
          />
        ))}
      </div>
    </div>
  );
}
