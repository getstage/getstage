import { useEffect, useState, type KeyboardEvent, type MouseEvent } from "react";
import { cn } from "@/lib/utils";
import { useCreditSummaryQuery, useSettingsOverviewQuery } from "@/hooks/convex-data";
import {
  formatSubscriptionPeriodDate,
  subscriptionPeriodLabel,
} from "@/lib/billing/subscriptionPeriodLabel";

type SidebarCreditsCardProps = {
  collapsed: boolean;
  onTopUp: () => void;
  onManagePlan: () => void;
  onExhausted?: () => void;
};

export function SidebarCreditsCard({
  collapsed,
  onTopUp,
  onManagePlan,
  onExhausted,
}: SidebarCreditsCardProps) {
  const credits = useCreditSummaryQuery();
  const overview = useSettingsOverviewQuery();
  const [isExpanded, setIsExpanded] = useState(false);

  const remaining = credits.data?.total ?? 0;
  const usedByKind = credits.data?.usedByKind ?? { voice: 0, moodboard: 0, reference: 0, other: 0 };
  const usedTotal = usedByKind.voice + usedByKind.moodboard + usedByKind.reference + usedByKind.other;
  const granted = remaining + usedTotal;
  const usedPercent = granted > 0 ? Math.round((usedTotal / granted) * 100) : 0;
  const isOutOfCredits = granted > 0 && remaining <= 0;
  const isLoading = credits.isLoading;

  // Voice = transcription; Visuals = Refero (moodboard + research references).
  const visualsUsed = usedByKind.moodboard + usedByKind.reference;
  const breakdown = [
    { label: "Voice", value: usedByKind.voice },
    { label: "Visuals", value: visualsUsed },
  ];
  const breakdownTotal = usedByKind.voice + visualsUsed;

  const subscription = overview.data?.subscription ?? null;
  const periodDate = subscription?.currentPeriodEnd
    ? formatSubscriptionPeriodDate(subscription.currentPeriodEnd, "sidebar")
    : null;
  const periodLabel = subscription ? subscriptionPeriodLabel(subscription, "sidebar") : null;

  useEffect(() => {
    if (isOutOfCredits) {
      onExhausted?.();
    }
  }, [isOutOfCredits, onExhausted]);

  if (collapsed) {
    return null;
  }

  function toggleExpanded() {
    setIsExpanded((current) => !current);
  }

  function handleCardKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }
    event.preventDefault();
    toggleExpanded();
  }

  function stopCardToggle(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
  }

  return (
    <section
      role="button"
      tabIndex={0}
      aria-expanded={isExpanded}
      aria-label={isExpanded ? "Hide credits details" : "Show credits details"}
      onClick={toggleExpanded}
      onKeyDown={handleCardKeyDown}
      className="w-full shrink-0 cursor-pointer rounded-[8px] bg-gradient-to-b from-white to-[#FAFAFA] p-[12px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] outline-none transition-[box-shadow,transform] hover:shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25),0_6px_18px_rgba(10,10,10,0.04)] focus-visible:ring-2 focus-visible:ring-[#9E99F8]"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-[6px]">
          <img src="/logos/credits.svg" alt="" aria-hidden="true" className="h-[14px] w-[14px] shrink-0" />
          <p className="min-w-0 truncate text-[12px] font-medium leading-[1.5] text-[#0A0A0A]">
            Credits Remaining
          </p>
        </div>
        <button
          type="button"
          aria-label={isExpanded ? "Hide credits details" : "Show credits details"}
          aria-expanded={isExpanded}
          onClick={(event) => {
            event.stopPropagation();
            toggleExpanded();
          }}
          className="flex h-[20px] w-[20px] shrink-0 cursor-pointer items-center justify-center rounded-[5px] text-[#404040] transition-colors hover:bg-[#F5F5F5]"
        >
          <img src="/logos/info.svg" alt="" aria-hidden="true" className="h-[16px] w-[16px]" />
        </button>
      </div>

      <div className="mt-[12px] flex flex-col gap-[12px]">
        <div className="flex flex-col gap-[10px]">
          <div className="flex items-end justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-[4px]">
              <p className="text-[16px] font-semibold leading-[1.2] tracking-[-0.16px] text-[#0A0A0A]">
                {isLoading ? "—" : remaining.toLocaleString()}
              </p>
              <p className="truncate text-[12px] font-medium leading-[1.5] text-[#737373]">
                of {isLoading ? "—" : granted.toLocaleString()} credits
              </p>
            </div>
            <p className="shrink-0 text-[11px] font-medium leading-[1.5] text-[#737373]">
              {isLoading ? "—" : `${usedPercent}% used`}
            </p>
          </div>

          <div className="h-[7px] w-full overflow-hidden rounded-[4px] bg-[#E5E5E5]">
            <div
              className="h-full rounded-[4px] bg-[#3B368E]"
              style={{ width: `${isOutOfCredits ? 100 : usedPercent}%` }}
            />
          </div>

          <div
            className={cn(
              "grid transition-[grid-template-rows,opacity] duration-200 ease-out",
              isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
            )}
          >
            <div className="min-h-0 overflow-hidden">
              <div className="flex flex-col gap-[8px] pt-[2px]">
                <div className="flex flex-col gap-[2px]">
                  {breakdown.map((item) => {
                    const share = breakdownTotal > 0 ? Math.round((item.value / breakdownTotal) * 100) : 0;
                    return (
                      <div key={item.label} className="flex items-center justify-between gap-3">
                        <p className="truncate text-[12px] font-medium leading-[1.5] text-[#737373]">
                          {item.label}
                        </p>
                        <p className="shrink-0 text-[11px] font-medium leading-[1.5] text-[#262626]">
                          {isLoading ? "—" : `${share}%`}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {periodDate && periodLabel ? (
                  <>
                    <div className="h-px w-full bg-[#E5E5E5]" />
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-[12px] font-medium leading-[1.5] text-[#737373]">
                        {periodLabel}
                      </p>
                      <p className="shrink-0 text-[11px] font-medium leading-[1.5] text-[#262626]">
                        {periodDate}
                      </p>
                    </div>
                    <div className="h-px w-full bg-[#E5E5E5]" />
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          {isExpanded ? (
            <button
              type="button"
              onClick={(event) => {
                stopCardToggle(event);
                onManagePlan();
              }}
              className="min-w-0 truncate text-left text-[11px] font-medium leading-[1.5] text-[#525252] transition-colors hover:text-[#0A0A0A]"
            >
              Manage Plan
            </button>
          ) : null}
          <button
            type="button"
            onClick={(event) => {
              stopCardToggle(event);
              onTopUp();
            }}
            className={cn(
              "inline-flex min-w-0 cursor-pointer items-center justify-between gap-[6px] text-[11px] font-medium leading-[1.5] transition-colors hover:text-[#0A0A0A]",
              isExpanded ? "ml-auto shrink-0" : "w-full",
              isExpanded ? "text-[#0A0A0A]" : "text-[#737373]",
            )}
          >
            <span className="truncate">Top Up</span>
            <img src="/logos/arrow-right.svg" alt="" aria-hidden="true" className="h-[14px] w-[14px] shrink-0" />
          </button>
        </div>
      </div>
    </section>
  );
}
