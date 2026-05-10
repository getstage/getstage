import { phaseSummarySchema, type PhaseSummary } from "@stage/data-ops";
import { z } from "zod";
import type { DesktopAuthController } from "../auth";
import { fetchDesktopApiJson } from "../helpers/desktop-api";

const phasesResponseSchema = z.object({
  phases: z.array(phaseSummarySchema),
});

const projectIdSchema = z.string().min(1, "Project id is required");

export async function listProjectPhases(
  authController: DesktopAuthController,
  rawProjectId: unknown,
): Promise<PhaseSummary[]> {
  const projectId = projectIdSchema.parse(rawProjectId);
  const data = await fetchDesktopApiJson<unknown>({
    authController,
    path: `/projects/${encodeURIComponent(projectId)}/phases`,
  });
  return phasesResponseSchema.parse(data).phases;
}
