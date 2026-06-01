import { useLayoutEffect, useRef, type KeyboardEvent } from "react";
import { EditIcon, SaveIcon } from "./researchIcons";

type ResearchSummaryProps = {
  summary: string[];
  isEditing: boolean;
  editItems?: string[];
  onEditItemsChange?: (items: string[]) => void;
  onEdit: () => void;
  onDiscard: () => void;
  onSave: () => void;
  isSaving?: boolean;
};

export function ResearchSummary({
  summary,
  isEditing,
  editItems,
  onEditItemsChange,
  onEdit,
  onDiscard,
  onSave,
  isSaving = false,
}: ResearchSummaryProps) {
  const items = editItems ?? summary;
  const editTextareaRefs = useRef<Array<HTMLTextAreaElement | null>>([]);

  useLayoutEffect(() => {
    if (!isEditing) {
      return;
    }

    editTextareaRefs.current.forEach((element) => {
      if (element) {
        autoResizeTextarea(element);
      }
    });
  }, [items, isEditing]);

  function updateEditLine(index: number, value: string) {
    const next = [...items];
    next[index] = value;
    onEditItemsChange?.(next);
  }

  function handleItemKeyDown(event: KeyboardEvent<HTMLTextAreaElement>, index: number) {
    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }

    event.preventDefault();
    const element = event.currentTarget;
    const before = element.value.slice(0, element.selectionStart);
    const after = element.value.slice(element.selectionEnd);
    const next = [...items];
    next[index] = before;
    next.splice(index + 1, 0, after);
    onEditItemsChange?.(next);

    window.requestAnimationFrame(() => {
      editTextareaRefs.current[index + 1]?.focus();
      editTextareaRefs.current[index + 1]?.setSelectionRange(0, 0);
    });
  }

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-[15px] font-medium leading-[1.25] text-[#171717]">Research Summary</h2>
        {isEditing ? (
          <div className="flex shrink-0 items-start gap-2">
            <button
              type="button"
              onClick={onDiscard}
              className="inline-flex h-[31px] items-center justify-center rounded-[6px] bg-[#F5F5F5] px-[10px] text-[12px] font-medium leading-[1.25] text-[#EF4444] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#FEE2E2]"
            >
              Discard Changes
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={isSaving}
              className="inline-flex h-[31px] items-center justify-center gap-2 rounded-[6px] border border-[#34D399] bg-gradient-to-b from-[#10B981] to-[#059669] px-3 text-[12px] font-medium leading-[1.25] text-[#ECFDF5] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-opacity hover:opacity-95 disabled:opacity-60"
            >
              <SaveIcon />
              Save Changes
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex h-[34px] shrink-0 cursor-pointer items-center justify-center gap-2 rounded-[6px] bg-[#F5F5F5] py-2 pl-[10px] pr-3 text-[13px] font-medium leading-none text-[#525252] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#ECECEC]"
          >
            <EditIcon />
            Edit Research
          </button>
        )}
      </div>
      {isEditing ? (
        <div className="flex flex-col items-start justify-center rounded-[8px] bg-[#F5F5F5] p-3">
          <ul className="min-w-full list-disc pl-[19.5px] text-[13px] font-medium leading-[1.5] text-[#525252]">
            {items.map((item, index) => (
              <li key={`${index}-${summary[index] ?? ""}`}>
                <textarea
                  ref={(element) => {
                    editTextareaRefs.current[index] = element;
                  }}
                  value={item}
                  onChange={(event) => {
                    autoResizeTextarea(event.currentTarget);
                    updateEditLine(index, event.target.value);
                  }}
                  onInput={(event) => autoResizeTextarea(event.currentTarget)}
                  onKeyDown={(event) => handleItemKeyDown(event, index)}
                  rows={1}
                  className="block min-h-[20px] w-full resize-none overflow-hidden bg-transparent p-0 text-[13px] font-medium leading-[1.5] text-[#525252] outline-none"
                  aria-label={`Research summary item ${index + 1}`}
                />
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <ul className="list-disc space-y-0 pl-[19.5px] text-[13px] font-medium leading-[1.5] text-[#525252]">
          {summary.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

function autoResizeTextarea(element: HTMLTextAreaElement) {
  element.style.height = "0px";
  element.style.height = `${element.scrollHeight}px`;
}
