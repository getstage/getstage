import type { Id } from "../../../_generated/dataModel";
import {
  GOOGLE_SHEETS_GUIDE_HINT,
  type ImportClient,
  type ImportedEntry,
  type ImportProject,
} from "../../../models/integrations/googleSheets";
import {
  normalizeDirection,
  normalizeEntryType,
  normalizeStatus,
  parseAmountToCents,
  parseDateToTimestamp,
} from "./normalize";

export function buildSourceRecordId(parts: Array<string | number>) {
  return parts.map((part) => String(part).trim()).join("|");
}

export function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "_");
}

export function normalizeImportHeader(value: string) {
  const normalized = normalizeHeader(value);
  switch (normalized) {
    case "counterparty":
      return "client";
    default:
      return normalized;
  }
}

export function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        value += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(value);
      value = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }
      row.push(value);
      rows.push(row);
      row = [];
      value = "";
      continue;
    }

    value += char;
  }

  if (value.length > 0 || row.length > 0) {
    row.push(value);
    rows.push(row);
  }

  return rows.filter((candidate) => candidate.some((cell) => cell.trim().length > 0));
}

export function looksLikeHtmlDocument(text: string) {
  const trimmed = text.trim().toLowerCase();
  return trimmed.startsWith("<!doctype html") || trimmed.startsWith("<html");
}

export function parseSheetUrl(sheetUrl: string) {
  const trimmed = sheetUrl.trim();
  if (!trimmed) {
    throw new Error("Google Sheets URL is required.");
  }

  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!match) {
    throw new Error("Use a valid Google Sheets URL.");
  }

  const url = new URL(trimmed);
  const gidFromSearch = url.searchParams.get("gid");
  const gidFromHash = new URLSearchParams(url.hash.replace(/^#/, "")).get("gid");

  return {
    sheetId: match[1],
    gid: gidFromSearch ?? gidFromHash ?? "0",
    sheetUrl: trimmed,
  };
}

export function buildSheetCsvUrl(sheetId: string, gid: string) {
  return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
}

export function buildSheetFetchErrorMessage(status: number) {
  switch (status) {
    case 401:
    case 403:
      return "Google blocked CSV export for this sheet. It may be viewable but not exportable. Enable viewer download/copy or publish it to the web, then retry.";
    case 404:
      return "Google could not find that sheet tab for export. Check the sheet URL and tab, then retry.";
    default:
      return `Google Sheets CSV export failed with HTTP ${status}. If the sheet is already public, publish it to the web or use CSV upload instead.`;
  }
}

const REQUIRED_HEADERS = ["date", "type", "direction", "client", "amount", "currency", "status"] as const;

export function parseImportedEntriesFromCsv(
  csvText: string,
  clients: ImportClient[],
  projects: ImportProject[],
) {
  const rows = parseCsv(csvText);
  if (rows.length < 2) {
    throw new Error("The file must contain a header row and at least one data row.");
  }

  const headerRow = rows[0];
  if (!headerRow) {
    throw new Error("The file must contain a header row.");
  }

  const headers = headerRow.map(normalizeImportHeader);
  for (const requiredHeader of REQUIRED_HEADERS) {
    if (!headers.includes(requiredHeader)) {
      const foundHeaders = headers.filter(Boolean).join(", ") || "none";
      throw new Error(
        `Stage could not find the required column '${requiredHeader}'. Open the Transactions tab template and check the guide. Found columns: ${foundHeaders}.`,
      );
    }
  }

  const clientSet = new Set(clients.map((client) => client.name.trim().toLowerCase()));
  const projectMap = new Map<string, Id<"projects">>(
    projects.map((project) => [project.name.trim().toLowerCase(), project.id]),
  );

  return rows.slice(1).map((row, index): ImportedEntry => {
    const record = Object.fromEntries(
      headers.map((header, headerIndex) => [header, row[headerIndex]?.trim() ?? ""]),
    ) as Record<string, string>;

    const amountValue = record.amount ?? "";
    const dateValue = record.date ?? "";
    const typeValue = record.type ?? "";
    const directionValue = record.direction ?? "";
    const clientValue = record.client ?? "";
    const statusValue = record.status ?? "";
    const currencyValue = record.currency ?? "";
    const externalReferenceValue = record.external_reference ?? "";
    const categoryValue = record.category ?? "";
    const notesValue = record.notes ?? "";
    const projectNameValue = record.project_name ?? "";
    const dueAtValue = record.due_at ?? "";
    const paidAtValue = record.paid_at ?? "";

    const amountCents = parseAmountToCents(amountValue);
    const occurredAt = parseDateToTimestamp(dateValue);
    const entryType = normalizeEntryType(typeValue);
    const direction = normalizeDirection(directionValue);
    const status = normalizeStatus(statusValue);
    const clientKey = clientValue.trim().toLowerCase();
    const projectKey = projectNameValue.trim().toLowerCase();

    if (!clientKey) {
      throw new Error(`Client is required. ${GOOGLE_SHEETS_GUIDE_HINT}`);
    }

    if (!clientSet.has(clientKey)) {
      throw new Error(
        `Client '${clientValue}' was not found in Stage yet. Create the client first, then retry. ${GOOGLE_SHEETS_GUIDE_HINT}`,
      );
    }

    if (projectKey && !projectMap.has(projectKey)) {
      throw new Error(
        `Project '${projectNameValue}' was not found in Stage yet. Create the project first, then retry. ${GOOGLE_SHEETS_GUIDE_HINT}`,
      );
    }

    return {
      sourceRecordId:
        externalReferenceValue ||
        buildSourceRecordId([dateValue, typeValue, directionValue, clientValue, amountCents, index]),
      entryType,
      direction,
      status,
      counterpartyName: clientValue,
      amountCents,
      currency: (currencyValue || "USD").toUpperCase(),
      occurredAt,
      dueAt: dueAtValue ? parseDateToTimestamp(dueAtValue) : undefined,
      paidAt: paidAtValue ? parseDateToTimestamp(paidAtValue) : undefined,
      projectId: projectKey ? projectMap.get(projectKey) : undefined,
      notes: [categoryValue, notesValue].filter(Boolean).join(" - ") || undefined,
      rawLabel: typeValue || undefined,
    };
  });
}
