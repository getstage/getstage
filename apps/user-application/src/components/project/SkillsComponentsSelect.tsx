import { useEffect, useId, useRef, useState } from "react";
import {
  COMPONENT_PACK_CATALOG,
  DISCOVER_SKILL_CATALOG,
  defaultProjectSelection,
  packsOfKind,
  skillsInCategory,
} from "@/lib/settings/skillsCatalog";
import { cn } from "@/lib/utils";

/** Structural subset shared by `DISCOVER_SKILL_CATALOG` and `COMPONENT_PACK_CATALOG`. */
export type CatalogOption = {
  id: string;
  name: string;
  description: string;
  iconSrc?: string;
};

const NONE_ID = "__none__";

/**
 * Single-select over one exclusivity axis of an Integrations catalog. Each axis owns one
 * dropdown, so two conflicting design skills or two conflicting base packs are unreachable.
 */
export function CategorySelect({
  label,
  options,
  selectedId,
  onChange,
  optional = false,
  disabled = false,
}: {
  label: string;
  options: readonly CatalogOption[];
  selectedId: string | null;
  onChange: (next: string | null) => void;
  optional?: boolean;
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

  const selected = options.find((option) => option.id === selectedId) ?? null;
  const entries: CatalogOption[] = optional
    ? [{ id: NONE_ID, name: "None", description: "Skip this choice" }, ...options]
    : [...options];

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
            selected ? "text-[#171717]" : "text-[#525252]",
          )}
        >
          <span className="flex min-w-0 items-center gap-[8px]">
            {selected?.iconSrc ? (
              <img
                src={selected.iconSrc}
                alt=""
                aria-hidden="true"
                className="h-[16px] w-[16px] shrink-0 rounded-[4px] object-contain"
              />
            ) : null}
            <span className="truncate">{selected ? selected.name : "None"}</span>
          </span>
          <SelectChevron open={isOpen} />
        </button>

        {isOpen ? (
          <div
            id={listboxId}
            role="listbox"
            aria-label={label}
            className="absolute left-0 right-0 top-[38px] z-30 flex max-h-[240px] flex-col gap-[2px] overflow-y-auto rounded-[8px] border border-[#e5e5e5] bg-white p-[4px] shadow-[0_18px_42px_rgba(10,10,10,0.12),0_0.45px_0.5px_rgba(10,10,10,0.25)]"
          >
            {entries.map((option) => {
              const isNone = option.id === NONE_ID;
              const isSelected = isNone ? selected === null : option.id === selectedId;
              return (
                <button
                  key={option.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(isNone ? null : option.id);
                    setIsOpen(false);
                  }}
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
    </div>
  );
}

const DESIGN_SKILLS = skillsInCategory("Design");
const MOTION_SKILLS = skillsInCategory("Motion");
const BASE_PACKS = packsOfKind("base");
const SECTIONS_PACKS = packsOfKind("sections");
const CHARTS_PACKS = packsOfKind("charts");

/** Resolved ids for the five project axes, defaults applied. */
export type ProjectSelection = {
  designSkillId: string;
  motionSkillId: string | null;
  basePackId: string;
  sectionsPackId: string | null;
  chartsPackId: string | null;
};

/**
 * Reads the two flat id arrays a project stores into the four axes. An empty or unknown
 * selection resolves to the Stage defaults for display without writing anything, so an
 * untouched project keeps falling through to engine defaults.
 */
export function resolveProjectSelection(
  skillIds: readonly string[],
  componentPackIds: readonly string[],
): ProjectSelection {
  const defaults = defaultProjectSelection();
  return {
    designSkillId:
      skillIds.find((id) => DESIGN_SKILLS.some((skill) => skill.id === id)) ??
      defaults.skillIds[0],
    motionSkillId: skillIds.find((id) => MOTION_SKILLS.some((skill) => skill.id === id)) ?? null,
    basePackId:
      componentPackIds.find((id) => BASE_PACKS.some((pack) => pack.id === id)) ??
      defaults.componentPackIds[0],
    sectionsPackId:
      componentPackIds.find((id) => SECTIONS_PACKS.some((pack) => pack.id === id)) ?? null,
    chartsPackId:
      componentPackIds.find((id) => CHARTS_PACKS.some((pack) => pack.id === id)) ?? null,
  };
}

/**
 * Name and icon for a catalog id, for read-only summaries. `null` when the axis is unset,
 * so the caller owns how "nothing chosen" reads. Only packs carry a logo; skills are
 * illustrated with a mesh that is too detailed to read at chip size.
 */
export function catalogEntry(id: string | null): { name: string; iconSrc?: string } | null {
  if (!id) return null;
  const skill = DISCOVER_SKILL_CATALOG.find((entry) => entry.id === id);
  if (skill) return { name: skill.name };
  const pack = COMPONENT_PACK_CATALOG.find((entry) => entry.id === id);
  if (pack) return { name: pack.name, iconSrc: pack.iconSrc };
  return { name: id };
}

/**
 * The five project axes as dropdowns, mapped to and from the two flat id arrays the
 * project stores. Unknown or legacy extra ids are dropped on the next change.
 */
export function SkillsComponentsPanel({
  skillIds,
  componentPackIds,
  onChange,
  disabled = false,
}: {
  skillIds: readonly string[];
  componentPackIds: readonly string[];
  onChange: (next: { skillIds: string[]; componentPackIds: string[] }) => void;
  disabled?: boolean;
}) {
  const current = resolveProjectSelection(skillIds, componentPackIds);

  function emit(next: Partial<ProjectSelection>) {
    const merged = { ...current, ...next };
    onChange({
      skillIds: [merged.designSkillId, ...(merged.motionSkillId ? [merged.motionSkillId] : [])],
      componentPackIds: [
        merged.basePackId,
        ...(merged.sectionsPackId ? [merged.sectionsPackId] : []),
        ...(merged.chartsPackId ? [merged.chartsPackId] : []),
      ],
    });
  }

  return (
    <>
      <CategorySelect
        label="Design skill"
        options={DESIGN_SKILLS}
        selectedId={current.designSkillId}
        onChange={(next) => emit({ designSkillId: next ?? current.designSkillId })}
        disabled={disabled}
      />
      <CategorySelect
        label="Motion skill (optional)"
        options={MOTION_SKILLS}
        selectedId={current.motionSkillId}
        onChange={(next) => emit({ motionSkillId: next })}
        optional
        disabled={disabled}
      />
      <CategorySelect
        label="Base system"
        options={BASE_PACKS}
        selectedId={current.basePackId}
        onChange={(next) => emit({ basePackId: next ?? current.basePackId })}
        disabled={disabled}
      />
      <CategorySelect
        label="Page sections (optional)"
        options={SECTIONS_PACKS}
        selectedId={current.sectionsPackId}
        onChange={(next) => emit({ sectionsPackId: next })}
        optional
        disabled={disabled}
      />
      <CategorySelect
        label="Data visuals (optional)"
        options={CHARTS_PACKS}
        selectedId={current.chartsPackId}
        onChange={(next) => emit({ chartsPackId: next })}
        optional
        disabled={disabled}
      />
    </>
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
