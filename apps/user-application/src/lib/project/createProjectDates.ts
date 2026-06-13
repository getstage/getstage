import type { z } from "zod";

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getDefaultProjectTimeline(today = new Date()) {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const targetMonth = start.getMonth() + 1;
  const lastDayOfTargetMonth = new Date(start.getFullYear(), targetMonth + 1, 0).getDate();
  const end = new Date(
    start.getFullYear(),
    targetMonth,
    Math.min(start.getDate(), lastDayOfTargetMonth),
  );

  return {
    startDate: formatDateInput(start),
    endDate: formatDateInput(end),
  };
}

export function getFirstZodError(result: { success: true } | { success: false; error: z.ZodError }) {
  if (result.success) return null;
  return result.error.issues[0]?.message ?? "Please check the highlighted fields.";
}

export function parseDateInput(value: string) {
  const trimmed = value.trim();
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (isoMatch) {
    return parseLocalDateParts(Number(isoMatch[1]), Number(isoMatch[2]), Number(isoMatch[3]));
  }

  const slashMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
  if (slashMatch) {
    const day = Number(slashMatch[1]);
    const month = Number(slashMatch[2]);
    const year = Number(slashMatch[3]);
    return parseLocalDateParts(year, month, day);
  }

  const compact = /^(\d{2})(\d{2})(\d{4})$/.exec(trimmed);
  if (compact) {
    const day = Number(compact[1]);
    const month = Number(compact[2]);
    const year = Number(compact[3]);
    return parseLocalDateParts(year, month, day);
  }

  return null;
}

function parseLocalDateParts(year: number, month: number, day: number) {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }

  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date.getTime();
}
