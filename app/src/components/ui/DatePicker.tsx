import { useEffect, useRef, useState } from "react";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

const DAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1; // Monday = 0
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

type DatePickerProps = {
  value: Date | null;
  onChange: (date: Date | null) => void;
  className?: string;
};

export function DatePicker({ value, onChange, className }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const today = new Date();

  const [viewYear, setViewYear] = useState(value?.getFullYear() ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(value?.getMonth() ?? today.getMonth());

  useEffect(() => {
    if (value) {
      setViewYear(value.getFullYear());
      setViewMonth(value.getMonth());
    }
  }, [value]);

  useEffect(() => {
    if (!open) return;

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

  function goToPrevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function goToNextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  function handleSelectDate(day: number) {
    const selected = new Date(viewYear, viewMonth, day, 23, 59, 59);
    onChange(selected);
    setOpen(false);
  }

  function handleClear() {
    onChange(null);
    setOpen(false);
  }

  function handleToday() {
    const now = new Date();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    onChange(todayEnd);
    setOpen(false);
  }

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

  const calendarDays: Array<{ day: number; isCurrentMonth: boolean }> = [];

  // Previous month trailing days
  const prevMonthDays = getDaysInMonth(
    viewMonth === 0 ? viewYear - 1 : viewYear,
    viewMonth === 0 ? 11 : viewMonth - 1,
  );
  for (let i = firstDay - 1; i >= 0; i--) {
    calendarDays.push({ day: prevMonthDays - i, isCurrentMonth: false });
  }

  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push({ day: i, isCurrentMonth: true });
  }

  // Next month leading days
  const remaining = 42 - calendarDays.length;
  for (let i = 1; i <= remaining; i++) {
    calendarDays.push({ day: i, isCurrentMonth: false });
  }

  const displayValue = value
    ? value.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null;

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md border px-2 text-[12px] transition-colors",
          value
            ? "border-accent/30 bg-accent/5 text-accent hover:bg-accent/10"
            : "border-border bg-white text-text-tertiary hover:border-accent hover:text-accent",
        )}
      >
        {displayValue ?? "Set deadline"}
      </button>

      {open ? (
        <div className="absolute left-0 top-full z-30 mt-1.5 w-[264px] rounded-[14px] border border-border bg-white p-3 shadow-[0_14px_30px_rgba(26,26,46,0.12)]">
          {/* Header */}
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={goToPrevMonth}
              className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-bg-subtle hover:text-text-primary"
            >
              <CaretLeft size={14} />
            </button>
            <span className="text-[13px] font-semibold text-text-primary">
              {MONTHS[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={goToNextMonth}
              className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-bg-subtle hover:text-text-primary"
            >
              <CaretRight size={14} />
            </button>
          </div>

          {/* Day headers */}
          <div className="mb-1 grid grid-cols-7 gap-0">
            {DAYS.map((day) => (
              <div
                key={day}
                className="flex h-8 items-center justify-center text-[11px] font-medium text-text-tertiary"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-0">
            {calendarDays.map((cell, index) => {
              const isSelected =
                cell.isCurrentMonth &&
                value !== null &&
                isSameDay(new Date(viewYear, viewMonth, cell.day), value);
              const isToday =
                cell.isCurrentMonth &&
                isSameDay(new Date(viewYear, viewMonth, cell.day), today);

              return (
                <button
                  key={index}
                  type="button"
                  disabled={!cell.isCurrentMonth}
                  onClick={() => cell.isCurrentMonth && handleSelectDate(cell.day)}
                  className={cn(
                    "flex h-8 w-full cursor-pointer items-center justify-center rounded-md text-[12px] transition-colors",
                    !cell.isCurrentMonth && "cursor-default text-text-tertiary/40",
                    cell.isCurrentMonth &&
                      !isSelected &&
                      !isToday &&
                      "text-text-primary hover:bg-bg-subtle",
                    isToday &&
                      !isSelected &&
                      "font-semibold text-accent",
                    isSelected &&
                      "bg-accent font-semibold text-white",
                  )}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="mt-2 flex items-center justify-between border-t border-border-subtle pt-2">
            <button
              type="button"
              onClick={handleClear}
              className="cursor-pointer text-[11px] text-text-tertiary transition-colors hover:text-destructive"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleToday}
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
