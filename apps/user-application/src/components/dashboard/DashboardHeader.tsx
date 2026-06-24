import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";

const PERIOD_OPTIONS = [
  { label: "Today", group: 0 },
  { label: "Yesterday", group: 0 },
  { label: "This week", group: 0 },
  { label: "This month", group: 0 },
  { label: "This year", group: 0 },
  { label: "30 days", group: 1 },
  { label: "6 months", group: 1 },
  { label: "12 months", group: 1 },
  { label: "All time", group: 2 },
] as const;

const INTER_FONT_FAMILY = '"Inter", -apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif';

export type DashboardPeriod = typeof PERIOD_OPTIONS[number]["label"];

export function DashboardHeader({
  engineStatusLabel,
  engineStatusTone = "neutral",
  greeting,
  subheading,
  selectedPeriod,
  onPeriodChange,
}: {
  engineStatusLabel?: string;
  engineStatusTone?: "neutral" | "ready" | "warning";
  greeting: string;
  subheading: string;
  selectedPeriod: DashboardPeriod;
  onPeriodChange: (period: DashboardPeriod) => void;
}) {
  const navigate = useNavigate();
  const [isPeriodMenuOpen, setIsPeriodMenuOpen] = useState(false);
  const periodMenuRef = useRef<HTMLDivElement | null>(null);
  const engineDotClassName =
    engineStatusTone === "ready"
      ? "bg-[#22c55e]"
      : engineStatusTone === "warning"
        ? "bg-[#ef4444]"
        : "bg-[#a3a3a3]";

  useEffect(() => {
    if (!isPeriodMenuOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (!periodMenuRef.current?.contains(event.target as Node)) {
        setIsPeriodMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsPeriodMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isPeriodMenuOpen]);

  return (
    <div className="grid gap-[14px] lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
      <div className="flex min-w-0 flex-col gap-[8px]">
        <h1 className="text-[20px] font-semibold leading-[1.2] text-[#0a0a0a]">
          {greeting}
        </h1>
        <p className="max-w-[360px] text-[13px] font-medium text-[#737373]">
          {subheading}
        </p>
      </div>

      <div className="flex w-full min-w-0 items-center gap-[10px] lg:w-auto">
        {engineStatusLabel ? (
          <div className="inline-flex h-[34px] shrink-0 items-center gap-2 rounded-[6px] bg-[#fafafa] px-[10px] text-[13px] font-medium text-[#737373] shadow-[0px_0.45px_1px_0px_rgba(10,10,10,0.25)]">
            <span
              className={`h-2 w-2 rounded-full ${engineDotClassName}`}
              aria-hidden="true"
            />
            <span>{engineStatusLabel}</span>
          </div>
        ) : null}

        <div ref={periodMenuRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setIsPeriodMenuOpen((current) => !current)}
            className="inline-flex h-[34px] cursor-pointer items-center gap-[8px] rounded-[6px] bg-[#f5f5f5] py-[6px] pl-[10px] pr-[12px] text-[13px] font-medium text-[#262626] shadow-[0px_0.45px_0.5px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#eeeeee]"
            aria-haspopup="menu"
            aria-expanded={isPeriodMenuOpen}
          >
            {selectedPeriod}
            <img
              src="/logos/dashboard/dropdown.svg"
              alt=""
              aria-hidden="true"
              className="h-[15px] w-[15px] shrink-0"
            />
          </button>

          {isPeriodMenuOpen ? (
            <PeriodMenu
              selectedPeriod={selectedPeriod}
              onSelect={(period) => {
                onPeriodChange(period);
                setIsPeriodMenuOpen(false);
              }}
            />
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => void navigate({ to: "/projects/create" })}
          className="inline-flex h-[34px] min-w-0 shrink-0 cursor-pointer items-center gap-2 rounded-[6px] border border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7b76df] to-[#463fba] py-[6px] pl-[10px] pr-[12px] text-[13px] font-medium text-[#fafafa] shadow-[0px_0.45px_1px_0px_rgba(10,10,10,0.25)] transition-opacity hover:opacity-90 max-[460px]:flex-1"
          style={{ textShadow: "0px 0.5px 1.5px rgba(0,0,0,0.15)" }}
        >
          <img src="/logos/dashboard/plus.svg" alt="" aria-hidden="true" className="h-3.5 w-3.5 brightness-0 invert" />
          Create Project
        </button>
      </div>
    </div>
  );
}

function PeriodMenu({
  selectedPeriod,
  onSelect,
}: {
  selectedPeriod: DashboardPeriod;
  onSelect: (period: DashboardPeriod) => void;
}) {
  return (
    <div
      role="menu"
      aria-label="Period"
      className="absolute right-0 top-[42px] z-50 flex w-[min(190px,calc(100vw-48px))] flex-col rounded-[10px] border border-[#e5e5e5] bg-white px-[8px] pb-[8px] pt-[10px] shadow-[0_18px_42px_rgba(10,10,10,0.12),0_0.45px_0.5px_rgba(10,10,10,0.25)]"
      style={{ fontFamily: INTER_FONT_FAMILY }}
    >
      <p className="px-[10px] pb-[4px] text-[12px] font-medium leading-[1.25] text-[#8a8a8a]">Period</p>
      <div className="flex flex-col gap-[2px]">
        {PERIOD_OPTIONS.map((option, index) => {
          const previous = PERIOD_OPTIONS[index - 1];
          const showDivider = previous && previous.group !== option.group;
          const isSelected = option.label === selectedPeriod;

          return (
            <div key={option.label} className={showDivider ? "border-t border-[#e5e5e5] pt-[2px]" : undefined}>
              <button
                type="button"
                role="menuitemradio"
                aria-checked={isSelected}
                onClick={() => onSelect(option.label)}
                className="grid h-[28px] w-full cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-[10px] rounded-[6px] px-[10px] text-left text-[12px] font-medium leading-[1.25] text-[#262626] outline-none transition-colors hover:bg-[#f5f5f5] focus-visible:bg-[#f5f5f5]"
                style={{ fontFamily: INTER_FONT_FAMILY }}
              >
                <span className="truncate">{option.label}</span>
                {isSelected ? <span className="h-[6px] w-[6px] rounded-full bg-[#8d87ff]" aria-hidden="true" /> : null}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
