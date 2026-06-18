import { useState, type KeyboardEvent, type MouseEvent } from "react";
import { cn } from "@/lib/utils";

const CREDIT_LIMIT = 5000;
const CREDIT_REMAINING = 2890;
const CREDIT_USED_PERCENT = 55;

const CREDIT_USAGE_BREAKDOWN = [
  { label: "Voice Board", value: "42%" },
  { label: "Mood Board", value: "31%" },
  { label: "References", value: "27%" },
] as const;

type SidebarCreditsCardProps = {
  collapsed: boolean;
  onTopUp: () => void;
  onManagePlan: () => void;
  creditsRemaining?: number;
  creditLimit?: number;
  creditUsedPercent?: number;
};

export function SidebarCreditsCard({
  collapsed,
  onTopUp,
  onManagePlan,
  creditsRemaining = CREDIT_REMAINING,
  creditLimit = CREDIT_LIMIT,
  creditUsedPercent = CREDIT_USED_PERCENT,
}: SidebarCreditsCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isOutOfCredits = creditsRemaining <= 0;
  const usedPercent = isOutOfCredits ? 100 : Math.min(100, Math.max(0, creditUsedPercent));

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
                {creditsRemaining.toLocaleString()}
              </p>
              <p className="truncate text-[12px] font-medium leading-[1.5] text-[#737373]">
                of {creditLimit.toLocaleString()} credits
              </p>
            </div>
            <p className="shrink-0 text-[11px] font-medium leading-[1.5] text-[#737373]">
              {usedPercent}% used
            </p>
          </div>

          <div className="h-[7px] w-full overflow-hidden rounded-[4px] bg-[#E5E5E5]">
            <div
              className="h-full rounded-[4px] bg-[#3B368E]"
              style={{ width: `${usedPercent}%` }}
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
                  {CREDIT_USAGE_BREAKDOWN.map((item) => (
                    <div key={item.label} className="flex items-center justify-between gap-3">
                      <p className="truncate text-[12px] font-medium leading-[1.5] text-[#737373]">
                        {item.label}
                      </p>
                      <p className="shrink-0 text-[11px] font-medium leading-[1.5] text-[#262626]">
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="h-px w-full bg-[#E5E5E5]" />

                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-[12px] font-medium leading-[1.5] text-[#737373]">
                    Renews
                  </p>
                  <p className="shrink-0 text-[11px] font-medium leading-[1.5] text-[#262626]">
                    Jul 14
                  </p>
                </div>

                <div className="h-px w-full bg-[#E5E5E5]" />
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
