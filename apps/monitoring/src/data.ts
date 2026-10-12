import raw from "./data/rollout.json";
import { rolloutSchema } from "./schema";

export const dataValidation = rolloutSchema.safeParse(raw);
// Fail closed in the UI; validation tests also gate production builds.
const rollout = dataValidation.success ? dataValidation.data : {
  phases: [], audit: [], setup: [], updatedAt: "", scope: "Invalid configuration",
};
export const phases = rollout.phases;
export const audit = rollout.audit;
export const setup = rollout.setup;
export const updatedAt = rollout.updatedAt;
export const scope = rollout.scope;
export type AuditItem = (typeof audit)[number];
export const statusLabels: Record<string, string> = {
  open: "Open", blocked: "Blocked", in_progress: "In progress", verified: "Verified",
};

export function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportAudit(items: AuditItem[]) {
  const fields = ["id", "phase", "priority", "owner", "status", "title", "change", "verification", "evidence"] as const;
  // Neutralize spreadsheet formulas as well as quoting CSV delimiters.
  const cell = (value: unknown) => {
    const text = String(value);
    return `"${(/^[=+\-@\t\r]/.test(text) ? `'${text}` : text).replaceAll('"', '""')}"`;
  };
  download("stage-monitoring-audit.csv", [fields.join(","), ...items.map(item => fields.map(field => cell(item[field])).join(","))].join("\r\n"), "text/csv;charset=utf-8");
}
