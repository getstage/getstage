import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const WEEK_DAYS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTH_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
});

type StageDatePickerProps = {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  className?: string;
};

export function StageDatePicker({
  value,
  onChange,
  ariaLabel,
  className,
}: StageDatePickerProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => parseDateValue(value) ?? new Date());
  const selectedDate = parseDateValue(value);
  const today = startOfDay(new Date());

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  useEffect(() => {
    const nextDate = parseDateValue(value);
    if (nextDate) {
      setViewDate(nextDate);
    }
  }, [value]);

  const days = useMemo(() => buildCalendarDays(viewDate), [viewDate]);
  const displayValue = formatDisplayValue(value);

  function moveMonth(delta: number) {
    setViewDate((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  }

  function selectDate(date: Date) {
    onChange(formatDateValue(date));
    setViewDate(date);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className={cn("relative w-full", className)}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={() => setOpen((nextOpen) => !nextOpen)}
        className="flex h-[34px] w-full items-center gap-[12px] rounded-[6px] bg-[#f5f5f5] px-[12px] text-left text-[12px] font-medium leading-[1.35] text-[#171717] shadow-[0px_0.45px_1px_rgba(10,10,10,0.25)] outline-none transition-colors hover:bg-[#eeeeee] focus:bg-white focus:ring-1 focus:ring-[#8782f5]"
      >
        <span
          aria-hidden="true"
          className="h-[16px] w-[16px] shrink-0 bg-current text-[#525252]"
          style={{
            WebkitMask: 'url("/logos/dashboard/calendar.svg") center / contain no-repeat',
            mask: 'url("/logos/dashboard/calendar.svg") center / contain no-repeat',
          }}
        />
        <span className={cn("min-w-0 truncate", !displayValue && "text-[#525252]")}>
          {displayValue || "DD/MM/YYYY"}
        </span>
      </button>

      {open ? (
        <div className="absolute left-0 top-[calc(100%+6px)] z-50 w-[266px] rounded-[8px] border border-[#e5e5e5] bg-white p-[12px] text-[#171717] shadow-[0_18px_42px_rgba(10,10,10,0.14)]">
          <div className="mb-[10px] flex items-center justify-between gap-[12px]">
            <button
              type="button"
              onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth(), 1))}
              className="flex min-w-0 items-center gap-[6px] text-[15px] font-semibold leading-[1.25] text-[#111121]"
            >
              <span className="truncate">{MONTH_FORMATTER.format(viewDate)}</span>
            </button>
            <div className="flex items-center gap-[4px]">
              <CalendarNavButton label="Previous month" direction="prev" onClick={() => moveMonth(-1)} />
              <CalendarNavButton label="Next month" direction="next" onClick={() => moveMonth(1)} />
            </div>
          </div>

          <div className="grid grid-cols-7 gap-y-[3px]">
            {WEEK_DAYS.map((day, index) => (
              <div key={`${day}-${index}`} className="flex h-[20px] items-center justify-center text-[12px] font-semibold leading-[1.25] text-[#525252]">
                {day}
              </div>
            ))}
            {days.map((day) => {
              const isSelected = selectedDate ? isSameDay(day.date, selectedDate) : false;
              const isToday = isSameDay(day.date, today);

              return (
                <button
                  key={day.date.toISOString()}
                  type="button"
                  onClick={() => selectDate(day.date)}
                  className={cn(
                    "mx-auto flex h-[27px] w-[27px] items-center justify-center rounded-[6px] pb-[1px] text-[13px] font-semibold leading-[1.25] outline-none transition-colors",
                    day.inMonth ? "text-[#171717] hover:bg-[#f5f5f5]" : "text-[#a3a3a3]",
                    isToday && !isSelected && "bg-[#f5f5f5] text-[#5f58cf]",
                    isSelected && "bg-[#8782f5] text-white shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] hover:bg-[#7b76df]",
                  )}
                >
                  {day.date.getDate()}
                </button>
              );
            })}
          </div>

          <div className="mt-[10px] flex items-center justify-between border-t border-[#eeeeee] pt-[10px]">
            <button type="button" onClick={() => onChange("")} className="text-[12px] font-semibold leading-[1.25] text-[#737373] hover:text-[#171717]">
              Clear
            </button>
            <button type="button" onClick={() => selectDate(today)} className="text-[12px] font-semibold leading-[1.25] text-[#5f58cf] hover:text-[#463fba]">
              Today
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CalendarNavButton({
  label,
  direction,
  onClick,
}: {
  label: string;
  direction: "prev" | "next";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-[28px] w-[28px] items-center justify-center rounded-[6px] text-[#525252] transition-colors hover:bg-[#f5f5f5] hover:text-[#171717]"
    >
      <span
        aria-hidden="true"
        className={cn(
          "h-[8px] w-[8px] border-b-[1.6px] border-l-[1.6px] border-current",
          direction === "prev" ? "rotate-45" : "-rotate-[135deg]",
        )}
      />
    </button>
  );
}

function buildCalendarDays(viewDate: Date) {
  const firstDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const startOffset = firstDay.getDay();
  const start = new Date(firstDay);
  start.setDate(firstDay.getDate() - startOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return {
      date,
      inMonth: date.getMonth() === viewDate.getMonth(),
    };
  });
}

function parseDateValue(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return date;
}

function formatDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDisplayValue(value: string) {
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return "";
  return `${day}/${month}/${year}`;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isSameDay(first: Date, second: Date) {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}
