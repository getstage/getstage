export function formatCurrency(value: number) {
  if (!Number.isFinite(value)) return "—";
  const sign = value < 0 ? "-" : "";
  return `${sign}$${Math.abs(value).toLocaleString("en-US")}`;
}

export function formatCompactCurrency(value: number) {
  if (!Number.isFinite(value)) return "—";

  const absolute = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  const units: Array<{ threshold: number; suffix: string }> = [
    { threshold: 1_000_000_000_000, suffix: "T" },
    { threshold: 1_000_000_000, suffix: "B" },
    { threshold: 1_000_000, suffix: "M" },
    { threshold: 1_000, suffix: "K" },
  ];

  for (const unit of units) {
    if (absolute >= unit.threshold) {
      const scaled = absolute / unit.threshold;
      const rounded = scaled >= 100 ? Math.round(scaled) : Math.round(scaled * 10) / 10;
      const compact = Number.isInteger(rounded)
        ? `${rounded}`
        : `${rounded}`.replace(/\.0$/, "");
      return `${sign}$${compact}${unit.suffix}`;
    }
  }

  return formatCurrency(value);
}

export function formatCurrencyDisplay(value: number) {
  if (!Number.isFinite(value)) {
    return { short: "—", full: "—", isCompact: false };
  }

  const full = formatCurrency(value);
  const isCompact = Math.abs(value) >= 1_000_000;

  return {
    short: isCompact ? formatCompactCurrency(value) : full,
    full,
    isCompact,
  };
}

export function formatInputDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function parseInputDate(value: string): number {
  return new Date(`${value}T00:00:00`).getTime();
}

export function normalizeHex(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  if (!/^#[0-9A-Fa-f]{6}$/.test(withHash)) {
    return null;
  }
  return withHash.toUpperCase();
}

export function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function formatPlanPrice(plan: "free" | "pro") {
  return plan === "pro" ? "Yearly plan" : "Unpaid";
}
