import { useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { SectionTitle } from "./ResearchPrimitives";
import { RegenerateIcon } from "./researchIcons";

type OpportunitiesProps = {
  opportunities: string[];
  isEditing: boolean;
  onRegenerate?: () => void;
};

export function Opportunities({ opportunities, isEditing, onRegenerate }: OpportunitiesProps) {
  const [editItems, setEditItems] = useState(opportunities);
  const textareaRefs = useRef<Array<HTMLTextAreaElement | null>>([]);

  useLayoutEffect(() => {
    if (!isEditing) {
      return;
    }

    textareaRefs.current.forEach((element) => {
      if (element) {
        autoResizeTextarea(element);
      }
    });
  }, [isEditing, editItems]);

  useLayoutEffect(() => {
    if (isEditing) {
      setEditItems(opportunities);
    }
  }, [isEditing, opportunities]);

  function updateEditItem(index: number, value: string) {
    setEditItems((current) => current.map((item, itemIndex) => (itemIndex === index ? value : item)));
  }

  function handleItemKeyDown(event: KeyboardEvent<HTMLTextAreaElement>, index: number) {
    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }

    event.preventDefault();
    const element = event.currentTarget;
    const before = element.value.slice(0, element.selectionStart);
    const after = element.value.slice(element.selectionEnd);

    setEditItems((current) => {
      const next = [...current];
      next[index] = before;
      next.splice(index + 1, 0, after);
      return next;
    });

    window.requestAnimationFrame(() => {
      textareaRefs.current[index + 1]?.focus();
      textareaRefs.current[index + 1]?.setSelectionRange(0, 0);
    });
  }

  return (
    <section className="flex flex-col gap-2">
      <SectionTitle>Opportunities</SectionTitle>
      {isEditing ? (
        <div className="flex flex-col items-start justify-center gap-4 rounded-[8px] bg-[#F5F5F5] p-3">
          <ul className="min-w-full list-disc pl-[19.5px] text-[13px] font-medium leading-[1.5] text-[#525252]">
            {editItems.map((opportunity, index) => (
              <li key={`${index}-${opportunity}`}>
                <textarea
                  ref={(element) => {
                    textareaRefs.current[index] = element;
                  }}
                  value={opportunity}
                  aria-label={`Opportunity ${index + 1}`}
                  onChange={(event) => {
                    autoResizeTextarea(event.currentTarget);
                    updateEditItem(index, event.target.value);
                  }}
                  onInput={(event) => autoResizeTextarea(event.currentTarget)}
                  onKeyDown={(event) => handleItemKeyDown(event, index)}
                  rows={1}
                  className="block min-h-[20px] w-full resize-none overflow-hidden bg-transparent p-0 text-[13px] font-medium leading-[1.5] text-[#525252] outline-none"
                />
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={onRegenerate}
            className="inline-flex h-[27px] cursor-pointer items-center gap-2 rounded-[4px] bg-white px-3 py-[6px] text-[12px] font-medium leading-none text-[#7C3AED] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#F5F3FF]"
          >
            <RegenerateIcon />
            Regenerate with AI
          </button>
        </div>
      ) : (
        <ul className="flex list-disc flex-col gap-2 pl-5 text-[13px] font-medium leading-[1.5] text-[#525252]">
          {opportunities.map((opportunity) => (
            <li key={opportunity}>{opportunity}</li>
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
