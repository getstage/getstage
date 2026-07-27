import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/** Structural subset shared by `DISCOVER_SKILL_CATALOG` and `COMPONENT_PACK_CATALOG`. */
export type CatalogOption = {
  id: string;
  name: string;
  description: string;
  iconSrc?: string;
};

/**
 * Multi-select over an Integrations catalog. The trigger stays a stable placeholder and
 * every selection is rendered as a removable chip below it, so N selections never
 * overflow the control.
 */
export function CatalogMultiSelect({
  label,
  placeholder,
  options,
  selectedIds,
  onChange,
  disabled = false,
}: {
  label: string;
  placeholder: string;
  options: readonly CatalogOption[];
  selectedIds: readonly string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const listboxId = useId();

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const selected = options.filter((option) => selectedIds.includes(option.id));

  function toggle(id: string) {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((entry) => entry !== id)
        : [...selectedIds, id],
    );
  }

  return (
    <div className="flex w-full flex-col items-start gap-[8px]">
      <span className="text-[13px] font-medium leading-[1.25] text-[#171717]">{label}</span>

      <div ref={containerRef} className="relative w-full">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen((current) => !current)}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          className={cn(
            "flex h-[34px] w-full items-center justify-between gap-[8px] rounded-[6px] bg-[#f5f5f5] px-[12px] text-left text-[12px] font-medium leading-[1.25] shadow-[0px_0.45px_1px_0px_rgba(10,10,10,0.25)] outline-none transition-colors",
            disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-[#eeeeee]",
            selected.length > 0 ? "text-[#171717]" : "text-[#525252]",
          )}
        >
          <span className="truncate">
            {selected.length > 0 ? `${selected.length} selected` : placeholder}
          </span>
          <SelectChevron open={isOpen} />
        </button>

        {isOpen ? (
          <div
            id={listboxId}
            role="listbox"
            aria-multiselectable="true"
            aria-label={label}
            className="absolute left-0 right-0 top-[38px] z-30 flex max-h-[240px] flex-col gap-[2px] overflow-y-auto rounded-[8px] border border-[#e5e5e5] bg-white p-[4px] shadow-[0_18px_42px_rgba(10,10,10,0.12),0_0.45px_0.5px_rgba(10,10,10,0.25)]"
          >
            {options.map((option) => {
              const isSelected = selectedIds.includes(option.id);
              return (
                <button
                  key={option.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => toggle(option.id)}
                  className="flex w-full cursor-pointer items-center gap-[8px] rounded-[6px] px-[8px] py-[6px] text-left transition-colors hover:bg-[#f5f5f5]"
                >
                  {option.iconSrc ? (
                    <img
                      src={option.iconSrc}
                      alt=""
                      aria-hidden="true"
                      className="h-[16px] w-[16px] shrink-0 rounded-[4px] object-contain"
                    />
                  ) : null}
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[12px] font-medium leading-[1.25] text-[#171717]">
                      {option.name}
                    </span>
                    <span className="truncate text-[11px] font-medium leading-[1.4] text-[#737373]">
                      {option.description}
                    </span>
                  </span>
                  <span
                    aria-hidden="true"
                    className={cn(
                      "flex h-[16px] w-[16px] shrink-0 items-center justify-center rounded-[4px] border",
                      isSelected
                        ? "border-transparent bg-gradient-to-b from-[#7B76DF] to-[#463FBA]"
                        : "border-[#D4D4D4] bg-white",
                    )}
                  >
                    {isSelected ? <CheckIcon /> : null}
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      {selected.length > 0 ? (
        <div className="flex w-full flex-wrap items-center gap-[6px]">
          {selected.map((option) => (
            <span
              key={option.id}
              className="flex items-center gap-[6px] rounded-[6px] bg-[#f5f5f5] py-[4px] pl-[8px] pr-[6px] text-[12px] font-medium leading-[1.25] text-[#171717]"
            >
              {option.iconSrc ? (
                <img
                  src={option.iconSrc}
                  alt=""
                  aria-hidden="true"
                  className="h-[14px] w-[14px] shrink-0 rounded-[3px] object-contain"
                />
              ) : null}
              {option.name}
              <button
                type="button"
                disabled={disabled}
                onClick={() => toggle(option.id)}
                aria-label={`Remove ${option.name}`}
                className="flex h-[14px] w-[14px] cursor-pointer items-center justify-center text-[#737373] transition-colors hover:text-[#171717] disabled:cursor-not-allowed"
              >
                <RemoveIcon />
              </button>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function SelectChevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className={cn(
        "h-[16px] w-[16px] shrink-0 text-[#171717] transition-transform",
        open ? "rotate-180" : "",
      )}
    >
      <path
        d="m4.5 6.5 3.5 3 3.5-3"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RemoveIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="h-[10px] w-[10px]">
      <path
        d="M3.5 3.5l9 9m0-9l-9 9"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="h-[10px] w-[10px]">
      <path
        d="M3.5 8.5l3 3 6-6"
        stroke="#FFFFFF"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
