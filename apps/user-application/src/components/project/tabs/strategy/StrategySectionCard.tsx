import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import type { StrategySection } from "@/models/project/strategyTab";
import { EditableStrategyContent } from "./EditableStrategySection";
import { StrategyContent } from "./StrategyContent";
import { StatusPill } from "./StrategyStatus";
import { CheckIcon, RegenerateIcon } from "./strategyIcons";

const StrategyEmojiPicker = lazy(() =>
  import("./StrategyEmojiPicker").then((module) => ({ default: module.StrategyEmojiPicker })),
);

const SECTION_EMOJIS: Record<string, string> = {
  "design direction": "🎨",
  "design principles": "📝",
  "target audience strategy": "👤",
  "content strategy": "✍🏼",
  "competitive positioning": "🏢",
  "key pages & objectives": "🎯",
  "accessibility & constraints": "⚠️",
};

function splitSectionTitle(title: string) {
  const segments = Array.from(
    new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(title),
  );
  const first = segments[0]?.segment ?? "";
  const hasEmoji = /\p{Extended_Pictographic}/u.test(first);

  return {
    emoji: hasEmoji ? first : SECTION_EMOJIS[title.toLowerCase()] ?? "💡",
    label: hasEmoji ? title.slice(first.length).trimStart() : title,
  };
}

export function StrategySectionCard({
  section,
  showDivider,
  isEditing,
  onSectionChange,
  onEmojiChange,
  onApprove,
  onRegenerate,
}: {
  section: StrategySection;
  showDivider: boolean;
  isEditing: boolean;
  onSectionChange: (section: StrategySection) => void;
  onEmojiChange: (emoji: string) => void;
  onApprove: () => void;
  onRegenerate: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const title = useMemo(() => splitSectionTitle(section.title), [section.title]);
  const emoji = section.emoji ?? title.emoji;

  useEffect(() => {
    if (!isEmojiPickerOpen) return;

    function closeOnPointerDown(event: PointerEvent) {
      if (!emojiPickerRef.current?.contains(event.target as Node)) {
        setIsEmojiPickerOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsEmojiPickerOpen(false);
        emojiButtonRef.current?.focus({ preventScroll: true });
      }
    }

    document.addEventListener("pointerdown", closeOnPointerDown);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnPointerDown);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isEmojiPickerOpen]);

  return (
    <div className="flex flex-col gap-4">
      {showDivider ? <div className="h-px w-full bg-[#E5E5E5]" /> : null}
      <div className="flex flex-col gap-2">
        <div className="flex min-h-6 flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsExpanded((current) => !current)}
            aria-expanded={isExpanded}
            aria-label={`${isExpanded ? "Collapse" : "Expand"} ${title.label}`}
            className="flex size-6 shrink-0 items-center justify-center rounded-[4px] border-[0.5px] border-[#E7E5E4] bg-[#F5F5F4] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.05)] transition-colors hover:bg-[#E7E5E4]"
          >
            <span className="flex size-3 items-center justify-center overflow-hidden">
              <img
                src="/logos/strategy-dropdown.svg"
                alt=""
                className={`h-[5px] w-2 transition-transform duration-200 ${
                  isExpanded ? "" : "-rotate-90"
                }`}
              />
            </span>
          </button>
          <div className="flex min-w-0 items-center">
            <div className="relative" ref={emojiPickerRef}>
              <button
                ref={emojiButtonRef}
                type="button"
                aria-label={`Change emoji for ${title.label}`}
                aria-expanded={isEmojiPickerOpen}
                onClick={() => setIsEmojiPickerOpen((current) => !current)}
                className="inline-flex size-6 cursor-pointer items-center justify-center text-[15px] leading-none transition-opacity duration-150 hover:opacity-60 focus-visible:rounded-[4px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED]"
              >
                {emoji}
              </button>
              {isEmojiPickerOpen ? (
                <div className="absolute left-0 top-7 z-50 overflow-hidden rounded-[8px] shadow-[0_8px_24px_rgba(10,10,10,0.12)]">
                  <Suspense
                    fallback={
                      <div className="flex h-[316px] w-[384px] items-center justify-center rounded-[8px] border border-[#E5E5E5] bg-white text-[12px] text-[#A3A3A3]">
                        Loading...
                      </div>
                    }
                  >
                    <StrategyEmojiPicker
                      onSelect={(nextEmoji) => {
                        onEmojiChange(nextEmoji);
                        setIsEmojiPickerOpen(false);
                        emojiButtonRef.current?.focus({ preventScroll: true });
                      }}
                    />
                  </Suspense>
                </div>
              ) : null}
            </div>
            <h2 className="min-w-0 text-[15px] font-semibold leading-normal text-[#171717]">
              {title.label}
            </h2>
          </div>
          <StatusPill status={section.status} />
        </div>
        <div
          className={`grid transition-[grid-template-rows,opacity] duration-200 ${
            isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="flex min-h-0 flex-col gap-2 overflow-hidden">
            {isEditing ? (
              <EditableStrategyContent
                section={section}
                onChange={onSectionChange}
                onRegenerate={onRegenerate}
              />
            ) : (
              <StrategyContent section={section} />
            )}
            {!isEditing && section.status === "action" ? (
              <div className="flex flex-wrap items-center gap-1">
                <button
                  type="button"
                  onClick={onApprove}
                  className="inline-flex h-[27px] cursor-pointer items-center gap-2 rounded-[4px] border border-[#34D399] bg-gradient-to-b from-[#10B981] to-[#059669] px-3 py-[6px] text-[12px] font-medium leading-[1.25] text-[#ECFDF5] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] hover:opacity-95"
                >
                  <CheckIcon />
                  Approve & Save
                </button>
                <button
                  type="button"
                  onClick={onRegenerate}
                  className="inline-flex h-[27px] cursor-pointer items-center gap-2 rounded-[4px] bg-white px-3 py-[6px] text-[12px] font-medium leading-[1.25] text-[#7C3AED] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] hover:bg-[#F5F3FF]"
                >
                  <RegenerateIcon />
                  Regenerate with AI
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
