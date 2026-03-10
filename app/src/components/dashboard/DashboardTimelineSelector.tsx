import { useEffect, useMemo, useRef, useState } from "react";
import { CaretDown } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import type { TimelineHorizon } from "@/components/dashboard/Timeline";

const PRIMARY_OPTIONS: Array<{ value: TimelineHorizon; label: string }> = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "thisWeek", label: "This week" },
  { value: "thisMonth", label: "This month" },
  { value: "thisYear", label: "This year" },
];

const SECONDARY_OPTIONS: Array<{ value: TimelineHorizon; label: string }> = [
  { value: "30d", label: "30 days" },
  { value: "6m", label: "6 months" },
  { value: "12m", label: "12 months" },
];

const ALL_TIME_OPTION: { value: TimelineHorizon; label: string } = {
  value: "all",
  label: "All time",
};

type DashboardTimelineSelectorProps = {
  value: TimelineHorizon;
  onChange: (value: TimelineHorizon) => void;
};

export function DashboardTimelineSelector({
  value,
  onChange,
}: DashboardTimelineSelectorProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const selectedLabel = useMemo(() => {
    for (const option of [...PRIMARY_OPTIONS, ALL_TIME_OPTION]) {
      if (option.value === value) return option.label;
    }
    for (const option of SECONDARY_OPTIONS) {
      if (option.value === value) return option.label;
    }
    return "This month";
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSelect = (nextValue: TimelineHorizon) => {
    onChange(nextValue);
    setIsOpen(false);
  };

  return (
    <div ref={rootRef} className="relative inline-flex w-fit">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
        className={`inline-flex h-[34px] cursor-pointer items-center gap-1.5 rounded-[7px] border bg-white px-3 text-[13px] font-medium text-text-primary transition-colors outline-none focus:outline-none focus-visible:outline-none ${
          isOpen ? "border-text-secondary" : "border-border"
        }`}
      >
        <span>{selectedLabel}</span>
        <CaretDown
          size={11}
          weight="bold"
          aria-hidden="true"
          className={`text-text-secondary transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {isOpen ? (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.14 } }}
            exit={{ opacity: 0, y: 4, transition: { duration: 0.12 } }}
            className="absolute left-0 top-full z-50 mt-1.5 min-w-[160px] rounded-[8px] border border-border bg-white p-1 shadow-[0_4px_16px_rgba(26,26,46,0.08)]"
          >
            <div className="px-2.5 pb-1 pt-1 text-[12px] font-medium text-text-secondary">
              Period
            </div>

            {PRIMARY_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option.value)}
                role="option"
                aria-selected={value === option.value}
                className="flex w-full cursor-pointer items-center justify-between rounded-[5px] px-2.5 py-1.5 text-left text-[14px] font-normal text-text-primary transition-colors hover:bg-border-subtle"
              >
                <span>{option.label}</span>
                {value === option.value ? (
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
                ) : null}
              </button>
            ))}

            <div className="my-1 h-px bg-border-subtle" />

            {SECONDARY_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option.value)}
                role="option"
                aria-selected={value === option.value}
                className="flex w-full cursor-pointer items-center justify-between rounded-[5px] px-2.5 py-1.5 text-left text-[14px] font-normal text-text-primary transition-colors hover:bg-border-subtle"
              >
                <span>{option.label}</span>
                {value === option.value ? (
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
                ) : null}
              </button>
            ))}

            <div className="my-1 h-px bg-border-subtle" />

            <button
              type="button"
              onClick={() => handleSelect(ALL_TIME_OPTION.value)}
              role="option"
              aria-selected={value === ALL_TIME_OPTION.value}
              className="flex w-full cursor-pointer items-center justify-between rounded-[5px] px-2.5 py-1.5 text-left text-[14px] font-normal text-text-primary transition-colors hover:bg-border-subtle"
            >
              <span>{ALL_TIME_OPTION.label}</span>
              {value === ALL_TIME_OPTION.value ? (
                <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
              ) : null}
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
