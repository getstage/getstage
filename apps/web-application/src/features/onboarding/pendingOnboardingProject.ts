import { z } from "zod";
import { createProjectInputSchema } from "@/data-ops/schema";
import type { CreateProjectInput } from "@/features/project-creation/createProjectFromDraft";

const PENDING_ONBOARDING_PROJECT_KEY = "stage:pending-onboarding-project";

const pendingOnboardingProjectSchema = z.object({
  source: z.literal("onboarding_paywall"),
  project: createProjectInputSchema,
});

export type PendingOnboardingProject = z.infer<typeof pendingOnboardingProjectSchema>;

export function savePendingOnboardingProject(project: CreateProjectInput) {
  window.sessionStorage.setItem(
    PENDING_ONBOARDING_PROJECT_KEY,
    JSON.stringify({
      source: "onboarding_paywall",
      project,
    } satisfies PendingOnboardingProject),
  );
}

export function loadPendingOnboardingProject(): PendingOnboardingProject | null {
  const raw = window.sessionStorage.getItem(PENDING_ONBOARDING_PROJECT_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsedJson: unknown = JSON.parse(raw);
    const parsedProject = pendingOnboardingProjectSchema.safeParse(parsedJson);
    if (!parsedProject.success) {
      clearPendingOnboardingProject();
      return null;
    }

    return parsedProject.data;
  } catch {
    clearPendingOnboardingProject();
    return null;
  }
}

export function clearPendingOnboardingProject() {
  window.sessionStorage.removeItem(PENDING_ONBOARDING_PROJECT_KEY);
}
