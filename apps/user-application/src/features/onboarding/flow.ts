import {
  clientInfoSchema,
  dateRangeInputSchema,
  projectBasicsSchema,
  projectTypeSchema,
} from "@/lib/validation";
import type { Method } from "../../../shared/project-creation";
import type { OnboardingStepId } from "./model";
import type { ProjectType } from "@/types";

type ValidationContext = {
  step: OnboardingStepId;
  setProjectLater: boolean;
  method: Method;
  projectName: string;
  hasProjectImage: boolean;
  clientName: string;
  clientEmail: string;
  projectType: ProjectType | null;
  typeOtherLabel: string;
  activePhasesLength: number;
  startDate: string;
  endDate: string;
};

export function getFlowSteps({
  setProjectLater,
}: {
  method: Method;
  setProjectLater: boolean;
}): OnboardingStepId[] {
  if (setProjectLater) {
    return ["welcome", "details", "paywall", "celebrating", "integrations", "claude"];
  }

  return [
    "welcome",
    "details",
    "project-type",
    "method",
    "timeline",
    "preview",
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
  typeOtherLabel,
  activePhasesLength,
  startDate,
  endDate,
}: ValidationContext) {
  switch (step) {
    case "welcome":
      return true;
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
      return (
        projectTypeSchema.safeParse(projectType).success &&
        (projectType !== "other" || typeOtherLabel.trim().length > 0)
      );
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
  typeOtherLabel,
  activePhasesLength,
  startDate,
  endDate,
}: ValidationContext) {
  switch (step) {
    case "welcome":
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
        return parsed.error.issues[0]?.message ?? "Please choose a project type.";
      }
      if (projectType === "other" && typeOtherLabel.trim().length === 0) {
        return "Please specify your project type.";
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
