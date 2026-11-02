import {
  clientInfoSchema,
  dateRangeInputSchema,
  projectBasicsSchema,
  projectTypeSchema,
} from "@/lib/validation";
import type { Method } from "../../../shared/project-creation";
import type { OnboardingStepId } from "./model";
import type { ProjectCategory } from "@/types";

type ValidationContext = {
  step: OnboardingStepId;
  setProjectLater: boolean;
  method: Method;
  projectName: string;
  hasProjectImage: boolean;
  clientName: string;
  clientEmail: string;
  projectType: ProjectCategory | null;
  activePhasesLength: number;
  startDate: string;
  endDate: string;
};

// STA-64: questions → workspace → first project → plan → tools. People who answered
// the questions on the web skip straight to the workspace.
export function getFlowSteps({
  skipQuestions = false,
}: {
  method: Method;
  setProjectLater: boolean;
  skipQuestions?: boolean;
}): OnboardingStepId[] {
  return [
    "welcome",
    ...(skipQuestions ? [] : (["questions"] as const)),
    "workspace",
    "project",
    "paywall",
    "celebrating",
    "integrations",
    "claude",
  ];
}

export function getCurrentStepForProgress(step: OnboardingStepId) {
  if (step === "creating" || step === "celebrating") {
    return "preview";
  }

  return step;
}

export function canContinue({
  step,
  setProjectLater,
  method,
  projectName,
  clientName,
  clientEmail,
  projectType,
  activePhasesLength,
  startDate,
  endDate,
}: ValidationContext) {
  switch (step) {
    case "welcome":
    case "questions":
    case "workspace":
      return true;
    case "project":
      return projectBasicsSchema.safeParse({ projectName }).success && projectTypeSchema.safeParse(projectType).success;
    case "claude":
      return true;
    case "details":
      return (
        setProjectLater ||
        (projectBasicsSchema.safeParse({ projectName }).success &&
          clientInfoSchema.safeParse({ clientName, clientEmail }).success)
      );
    case "client":
      return clientInfoSchema.safeParse({ clientName, clientEmail }).success;
    case "project-type":
      return projectTypeSchema.safeParse(projectType).success;
    case "method":
      return method === "manual" ? activePhasesLength >= 2 : method !== null;
    case "timeline": {
      const parsed = dateRangeInputSchema.safeParse({ startDate, endDate });
      return parsed.success;
    }
    case "preview":
    case "integrations":
    case "celebrating":
      return true;
    case "creating":
      return false;
    default:
      return false;
  }
}

export function getStepValidationError({
  step,
  setProjectLater,
  method,
  projectName,
  clientName,
  clientEmail,
  projectType,
  activePhasesLength,
  startDate,
  endDate,
}: ValidationContext) {
  switch (step) {
    case "welcome":
    case "questions":
    case "workspace":
      return null;
    case "project":
      if (!projectBasicsSchema.safeParse({ projectName }).success) return "Give your project a name.";
      if (!projectTypeSchema.safeParse(projectType).success) return "Choose what you're building.";
      return null;
    case "claude":
      return null;
    case "details": {
      if (setProjectLater) {
        return null;
      }

      const basicsParsed = projectBasicsSchema.safeParse({ projectName });
      if (!basicsParsed.success) {
        return basicsParsed.error.issues[0]?.message ?? "Please enter a project name.";
      }
      const clientNameParsed = clientInfoSchema.shape.clientName.safeParse(clientName);
      if (!clientNameParsed.success) {
        return clientNameParsed.error.issues[0]?.message ?? "Please enter a client name.";
      }
      const clientEmailParsed = clientInfoSchema.shape.clientEmail.safeParse(clientEmail);
      if (!clientEmailParsed.success) {
        return clientEmail.trim().length === 0
          ? "Client email is required."
          : (clientEmailParsed.error.issues[0]?.message ?? "Please enter a valid email address.");
      }
      return null;
    }
    case "client": {
      const clientNameParsed = clientInfoSchema.shape.clientName.safeParse(clientName);
      if (!clientNameParsed.success) {
        return clientNameParsed.error.issues[0]?.message ?? "Please enter a client name.";
      }
      const clientEmailParsed = clientInfoSchema.shape.clientEmail.safeParse(clientEmail);
      if (!clientEmailParsed.success) {
        return clientEmail.trim().length === 0
          ? "Client email is required."
          : (clientEmailParsed.error.issues[0]?.message ?? "Please enter a valid email address.");
      }
      return null;
    }
    case "project-type": {
      const parsed = projectTypeSchema.safeParse(projectType);
      if (!parsed.success) {
        return parsed.error.issues[0]?.message ?? "Please choose a project category.";
      }
      return null;
    }
    case "method":
      if (!method) {
        return "Choose how you want to build your roadmap.";
      }
      return method === "manual" && activePhasesLength < 2
        ? "Select at least two phases."
        : null;
    case "timeline": {
      const parsed = dateRangeInputSchema.safeParse({ startDate, endDate });
      return parsed.success
        ? null
        : (parsed.error.issues[0]?.message ?? "Select a valid timeline.");
    }
    case "preview":
    case "integrations":
    case "creating":
    case "celebrating":
    default:
      return null;
  }
}
