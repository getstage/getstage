import { GOOGLE_SHEETS_GUIDE_HINT } from "../../../models/integrations/googleSheets";

export function parseAmountToCents(rawValue: string) {
  const stripped = rawValue.replace(/[^\d,.-]/g, "");
  if (!stripped) {
    throw new Error("Amount is required.");
  }

  let normalized = stripped;
  const lastDot = normalized.lastIndexOf(".");
  const lastComma = normalized.lastIndexOf(",");

  if (lastDot !== -1 && lastComma !== -1) {
    if (lastComma > lastDot) {
      normalized = normalized.replace(/\./g, "").replace(",", ".");
    } else {
      normalized = normalized.replace(/,/g, "");
    }
  } else if (lastComma !== -1) {
    normalized = normalized.replace(",", ".");
  }

  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid amount: ${rawValue}`);
  }

  return Math.round(parsed * 100);
}

export function parseDateToTimestamp(rawValue: string) {
  const parsed = Date.parse(rawValue);
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid date: ${rawValue}. ${GOOGLE_SHEETS_GUIDE_HINT}`);
  }
  return parsed;
}

export function normalizeEntryType(value: string) {
  const normalized = value.trim().toLowerCase();
  switch (normalized) {
    case "invoice":
      return "invoice" as const;
    case "expense":
    case "salary":
    case "tax":
      return "expense" as const;
    case "loan":
    case "other":
      return "adjustment" as const;
    case "payment":
    case "refund":
    case "adjustment":
      return normalized as "payment" | "refund" | "adjustment";
    default:
      throw new Error(`Unsupported type: ${value}. ${GOOGLE_SHEETS_GUIDE_HINT}`);
  }
}

export function normalizeDirection(value: string) {
  const normalized = value.trim().toLowerCase();
  if (normalized === "in" || normalized === "incoming") {
    return "incoming";
  }
  if (normalized === "out" || normalized === "outgoing") {
    return "outgoing";
  }
  throw new Error(`Unsupported direction: ${value}. ${GOOGLE_SHEETS_GUIDE_HINT}`);
}

export function normalizeStatus(value: string) {
  const normalized = value.trim().toLowerCase();
  switch (normalized) {
    case "draft":
      return "draft" as const;
    case "open":
    case "pending":
      return "pending" as const;
    case "paid":
    case "succeeded":
    case "complete":
      return "paid" as const;
    case "overdue":
    case "past_due":
      return "overdue" as const;
    case "cancelled":
    case "canceled":
    case "failed":
      return "failed" as const;
    default:
      throw new Error(`Unsupported status: ${value}. ${GOOGLE_SHEETS_GUIDE_HINT}`);
  }
}
