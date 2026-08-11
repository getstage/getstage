import { useEffect, useState } from "react";
import {
  catalogEntry,
  resolveProjectSelection,
  SkillsComponentsPanel,
} from "@/components/project/SkillsComponentsSelect";
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
  const active = draft ?? { skillIds, componentPackIds };
  const selection = resolveProjectSelection(active.skillIds, active.componentPackIds);

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
      await onSave(draft);
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
        <div>
          <p className="text-[13px] font-medium leading-[1.25] text-[#171717]">
            Skills &amp; components for this run
          </p>
          <div className="mt-3 flex flex-wrap items-start gap-x-10 gap-y-3">
            <SelectionFact label="Design skill" id={selection.designSkillId} />
            <SelectionFact label="Motion" id={selection.motionSkillId} />
            <SelectionFact label="Base system" id={selection.basePackId} />
            <SelectionFact label="Sections" id={selection.sectionsPackId} />
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

function SelectionFact({ label, id }: { label: string; id: string | null }) {
  const entry = catalogEntry(id);

  return (
    <div className="shrink-0">
      <p className="text-[11px] font-medium leading-none text-[#A3A3A3]">{label}</p>
      <p className="mt-[6px] flex items-center gap-[6px] text-[13px] font-medium leading-none">
        {entry?.iconSrc ? (
          <img
            src={entry.iconSrc}
            alt=""
            aria-hidden="true"
            className="h-4 w-4 shrink-0 rounded-[4px] object-contain"
          />
        ) : null}
        <span className={entry ? "text-[#171717]" : "text-[#A3A3A3]"}>
          {entry?.name ?? "None"}
        </span>
      </p>
    </div>
  );
}
