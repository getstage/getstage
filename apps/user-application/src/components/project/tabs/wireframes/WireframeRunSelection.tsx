import { useEffect, useState } from "react";
import { catalogEntry, SkillsComponentsPanel } from "@/components/project/SkillsComponentsSelect";
import { sanitizeProjectCatalogSelection } from "@/lib/settings/skillHubIds";
import { PrimaryButton, SecondaryButton } from "./WireframePrimitives";

export type WireframeRunSelectionInput = {
  skillIds: string[];
  componentPackIds: string[];
};

export function WireframeRunSelection({
  skillIds,
  componentPackIds,
  onSave,
  onEditStateChange,
}: {
  skillIds: readonly string[];
  componentPackIds: readonly string[];
  onSave: (input: WireframeRunSelectionInput) => Promise<void>;
  onEditStateChange?: (isEditingOrSaving: boolean) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<WireframeRunSelectionInput | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const active = draft ?? sanitizeProjectCatalogSelection(skillIds, componentPackIds);

  useEffect(() => {
    onEditStateChange?.(isEditing || isSaving);
  }, [isEditing, isSaving, onEditStateChange]);

  function closeEditor() {
    setDraft(null);
    setError(null);
    setIsEditing(false);
  }

  async function save() {
    if (!draft || isSaving) {
      closeEditor();
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await onSave(sanitizeProjectCatalogSelection(draft.skillIds, draft.componentPackIds));
      closeEditor();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save the selection.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="rounded-[8px] bg-white p-4 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium leading-[1.25] text-[#171717]">
            Skills &amp; components for this run
          </p>
          <div className="mt-3 flex flex-col gap-3">
            <SelectionList label="Skills" ids={active.skillIds} />
            <SelectionList label="Components" ids={active.componentPackIds} />
          </div>
        </div>
        <SecondaryButton onClick={isEditing ? closeEditor : () => setIsEditing(true)}>
          {isEditing ? "Cancel" : "Edit"}
        </SecondaryButton>
      </div>

      {isEditing ? (
        <div className="mt-4 flex flex-col gap-4 border-t border-[#E5E5E5] pt-4">
          <SkillsComponentsPanel
            skillIds={active.skillIds}
            componentPackIds={active.componentPackIds}
            onChange={setDraft}
            disabled={isSaving}
          />
          {error ? <p className="text-[12px] font-medium text-[#b91c1c]">{error}</p> : null}
          <div className="flex justify-end">
            <PrimaryButton onClick={() => void save()} disabled={isSaving}>
              {isSaving ? "Saving…" : "Save selection"}
            </PrimaryButton>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SelectionList({ label, ids }: { label: string; ids: readonly string[] }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium leading-none text-[#A3A3A3]">{label}</p>
      <div className="mt-[8px] flex flex-wrap gap-[6px]">
        {ids.length === 0 ? (
          <span className="text-[13px] font-medium leading-none text-[#A3A3A3]">None</span>
        ) : (
          ids.map((id) => {
            const entry = catalogEntry(id);
            return (
              <span
                key={id}
                className="inline-flex items-center gap-[6px] rounded-[6px] bg-[#F5F5F5] px-[8px] py-[5px] text-[12px] font-medium leading-none text-[#171717]"
              >
                {entry?.iconSrc ? (
                  <img
                    src={entry.iconSrc}
                    alt=""
                    aria-hidden="true"
                    className="h-3.5 w-3.5 shrink-0 rounded-[3px] object-contain"
                  />
                ) : null}
                {entry?.name ?? id}
              </span>
            );
          })
        )}
      </div>
    </div>
  );
}
