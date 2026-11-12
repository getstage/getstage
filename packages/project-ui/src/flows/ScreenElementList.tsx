import { useEffect, useRef } from "react";
import { X } from "@phosphor-icons/react";

export function ScreenElementList({
  elements,
  editing = false,
  onDraftElementChange,
}: {
  elements: string[];
  editing?: boolean;
  onDraftElementChange?: (elementIndex: number, value: string) => void;
}) {
  return (
    <ul className="m-0 flex list-disc flex-col gap-0 pl-[28px] text-[12px] font-medium leading-[1.25] text-[#262626]">
      {elements.map((element, elementIndex) => (
        <li key={`element-${elementIndex}`} className="py-[6px] pr-3 marker:text-[#262626]">
          {editing ? (
            <input
              aria-label={`Key element ${elementIndex + 1}`}
              value={element}
              placeholder={elementIndex === elements.length - 1 && !element ? "Add an element" : undefined}
              onChange={(event) => onDraftElementChange?.(elementIndex, event.target.value)}
              className="block h-[12px] w-full min-w-0 appearance-none border-0 bg-transparent p-0 text-[12px] font-medium leading-[1.25] text-[#262626] outline-none placeholder:text-[#737373] focus:text-[#171717]"
            />
          ) : (
            <span className="leading-[1.25]">{element}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

// Editing reads like a list in a notes app: Enter starts the next element, Backspace on
// an empty one removes it, and the last row is always an empty one to type a new element.
export function ScreenElementEditor({ elements, onChange }: { elements: string[]; onChange: (elements: string[]) => void }) {
  const inputs = useRef<Array<HTMLInputElement | null>>([]);
  const focusIndex = useRef<number | null>(null);
  const rows = [...elements, ""];

  useEffect(() => {
    if (focusIndex.current === null) return;
    inputs.current[focusIndex.current]?.focus();
    focusIndex.current = null;
  });

  const setAt = (index: number, value: string) =>
    onChange(index === elements.length ? [...elements, value] : elements.map((element, i) => (i === index ? value : element)));
  const removeAt = (index: number) => {
    onChange(elements.filter((_, i) => i !== index));
    focusIndex.current = Math.max(0, index - 1);
  };

  return (
    <ul className="m-0 flex list-none flex-col gap-0.5 px-2">
      {rows.map((element, index) => {
        const isNew = index === elements.length;
        return (
          <li key={`element-${index}`} className="flows-screen-element-row">
            <span aria-hidden="true" className="w-3 shrink-0 text-center text-[12px] text-[#737373]">{isNew ? "+" : "•"}</span>
            <input
              ref={(node) => { inputs.current[index] = node; }}
              aria-label={isNew ? "Add an element" : `Key element ${index + 1}`}
              value={element}
              placeholder={isNew ? "Add an element" : undefined}
              onChange={(event) => setAt(index, event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  if (element.trim()) focusIndex.current = index + 1;
                } else if (event.key === "Backspace" && !element && !isNew) {
                  event.preventDefault();
                  removeAt(index);
                } else if (event.key === "ArrowDown") {
                  inputs.current[index + 1]?.focus();
                } else if (event.key === "ArrowUp") {
                  inputs.current[index - 1]?.focus();
                }
              }}
              className="flows-screen-element-input"
            />
            {isNew ? <span className="w-[22px] shrink-0" /> : (
              <button type="button" aria-label={`Remove ${element || "element"}`} className="flows-screen-element-remove" onClick={() => removeAt(index)}>
                <X size={12} />
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
