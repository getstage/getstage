import { z } from "zod";

const text = z.string().trim().min(1).max(2400);
const phaseId = z.number().int().min(1).max(7);
export const rolloutSchema = z.strictObject({
  updatedAt: z.iso.date(),
  scope: text,
  phases: z.array(z.strictObject({
    id: phaseId, status: z.enum(["open", "in_progress", "verified"]), name: text, area: text, description: text,
    acceptance: text, files: z.array(text).min(1).max(20),
  })).length(7),
  audit: z.array(z.strictObject({
    id: z.string().regex(/^MON-\d{3}$/), phase: phaseId,
    priority: z.enum(["P0", "P1", "P2"]),
    owner: z.enum(["Engineering", "Werner", "Adrien"]),
    status: z.enum(["open", "blocked", "in_progress", "verified"]),
    title: text, change: text, verification: text, evidence: text,
  })).min(1).max(200),
  setup: z.array(z.strictObject({
    title: text, owner: z.enum(["Werner", "Adrien", "Werner + Adrien"]), detail: text, unlocks: text,
  })).min(1).max(20),
}).superRefine((data, ctx) => {
  if (new Set(data.phases.map(phase => phase.id)).size !== 7) {
    ctx.addIssue({ code: "custom", path: ["phases"], message: "Phase ids must be unique and cover 1–7." });
  }
  if (new Set(data.audit.map(item => item.id)).size !== data.audit.length) {
    ctx.addIssue({ code: "custom", path: ["audit"], message: "Audit ids must be unique." });
  }
});
