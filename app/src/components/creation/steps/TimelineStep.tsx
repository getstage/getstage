import { useEffect, useRef, useState } from "react";
import { BackButton, PrimaryButton } from "@/components/creation/CreationChrome";
import { cn } from "@/lib/utils";
import type { WorkflowStep } from "@/hooks/useProjectCreation";

type TimelineStepProps = {
  canContinue: boolean;
  currentIndex: number;
  steps: WorkflowStep[];
  startDate: string;
  endDate: string;
  continueLabel: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onContinue: () => void;
  onBack: () => void;
};

export function TimelineStep({
  canContinue,
  currentIndex: _currentIndex,
  steps: _steps,
  startDate,
  endDate,
  continueLabel,
  onStartDateChange,
  onEndDateChange,
  onContinue,
  onBack,
}: TimelineStepProps) {
  return (
    <div>
      <div className="mb-7 rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
        <div className="px-4 pb-3 pt-3 text-[13px] font-semibold text-text-primary">Timeline</div>
        <div className="flex flex-col gap-3 rounded-[8px] bg-white p-4 shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] sm:flex-row">
          <DateField label="Start" value={startDate} onChange={onStartDateChange} />
          <DateField label="End" value={endDate} onChange={onEndDateChange} />
        </div>
      </div>

      <PrimaryButton label={continueLabel} disabled={!canContinue} onClick={onContinue} />
      <BackButton onClick={onBack} />
    </div>
  );
}

const CALENDAR_DAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const CALENDAR_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function formatTimelineDate(value: string) {
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) {
    return "DD/MM/YYYY";
  }

  return `${day}-${month}-${year}`;
}

function formatDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseDateInputValue(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) {
    return null;
  }

  return new Date(year, month - 1, day);
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

function isSameCalendarDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

type DateFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

function DateField({ label, value, onChange }: DateFieldProps) {
  const selectedDate = parseDateInputValue(value);
  const today = new Date();
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(selectedDate?.getFullYear() ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(selectedDate?.getMonth() ?? today.getMonth());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const nextDate = parseDateInputValue(value);
    if (!nextDate) {
      return;
    }

    setViewYear(nextDate.getFullYear());
    setViewMonth(nextDate.getMonth());
  }, [value]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
  const previousMonthDays = getDaysInMonth(
    viewMonth === 0 ? viewYear - 1 : viewYear,
    viewMonth === 0 ? 11 : viewMonth - 1,
  );
  const calendarDays: Array<{ day: number; current: boolean }> = [];

  for (let index = firstDay - 1; index >= 0; index -= 1) {
    calendarDays.push({ day: previousMonthDays - index, current: false });
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    calendarDays.push({ day, current: true });
  }
  while (calendarDays.length < 42) {
    calendarDays.push({ day: calendarDays.length - firstDay - daysInMonth + 1, current: false });
  }

  function goToPreviousMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((year) => year - 1);
      return;
    }

    setViewMonth((month) => month - 1);
  }

  function goToNextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((year) => year + 1);
      return;
    }

    setViewMonth((month) => month + 1);
  }

  function selectDay(day: number) {
    onChange(formatDateInputValue(new Date(viewYear, viewMonth, day)));
    setOpen(false);
  }

  function selectToday() {
    const now = new Date();
    onChange(formatDateInputValue(now));
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative flex-1">
      <label className="mb-2 block text-[13px] font-semibold text-text-primary">{label}</label>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="relative flex h-10 w-full cursor-pointer items-center gap-3 rounded-[6px] bg-[#F5F5F5] px-3 text-left shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#EFEFEF] focus:outline-none"
      >
        <img src="/logos/calendar.svg" alt="" className="h-4 w-4 shrink-0 opacity-70" />
        <span className={cn("min-w-0 flex-1 text-[12px] font-medium", value ? "text-text-secondary" : "text-text-tertiary")}>
          {formatTimelineDate(value)}
        </span>
      </button>

      {open ? (
        <div className="absolute left-0 top-full z-50 mt-2 w-[280px] rounded-[14px] border border-border bg-white p-3 shadow-[0_16px_36px_rgba(26,26,46,0.16)]">
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={goToPreviousMonth}
              className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-[20px] text-text-secondary transition-colors hover:bg-bg-subtle hover:text-text-primary"
              aria-label="Previous month"
            >
              ‹
            </button>
            <span className="text-[13px] font-semibold text-text-primary">
              {CALENDAR_MONTHS[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={goToNextMonth}
              className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-[20px] text-text-secondary transition-colors hover:bg-bg-subtle hover:text-text-primary"
              aria-label="Next month"
            >
              ›
            </button>
          </div>

          <div className="mb-1 grid grid-cols-7">
            {CALENDAR_DAYS.map((day) => (
              <div key={day} className="flex h-8 items-center justify-center text-[11px] font-medium text-text-tertiary">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {calendarDays.map((cell, index) => {
              const currentDate = new Date(viewYear, viewMonth, cell.day);
              const selected = cell.current && selectedDate !== null && isSameCalendarDay(currentDate, selectedDate);
              const currentToday = cell.current && isSameCalendarDay(currentDate, today);

              return (
                <button
                  key={`${cell.current ? "current" : "outside"}-${cell.day}-${index}`}
                  type="button"
                  disabled={!cell.current}
                  onClick={() => selectDay(cell.day)}
                  className={cn(
                    "flex h-8 w-full cursor-pointer items-center justify-center rounded-md text-[12px] transition-colors",
                    !cell.current && "cursor-default text-text-tertiary/35",
                    cell.current && !selected && !currentToday && "text-text-primary hover:bg-bg-subtle",
                    currentToday && !selected && "font-semibold text-accent",
                    selected && "bg-accent font-semibold text-white",
                  )}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>

          <div className="mt-2 flex items-center justify-between border-t border-border-subtle pt-2">
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className="cursor-pointer text-[11px] text-text-tertiary transition-colors hover:text-destructive"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={selectToday}
              className="cursor-pointer text-[11px] font-medium text-accent transition-colors hover:text-accent/80"
            >
              Today
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
