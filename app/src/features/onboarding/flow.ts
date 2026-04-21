import {
  clientInfoSchema,
  dateRangeInputSchema,
  projectBasicsSchema,
  projectTypeSchema as projectTypeValidationSchema,
} from "@/lib/validation";
import type { ProjectType } from "@/types";
import type { Method } from "../../../shared/project-creation";
import type { OnboardingStepId } from "./model";

type ValidationContext = {
  step: OnboardingStepId;
  fieldOfWork: ProjectType[];
  setProjectLater: boolean;
  method: Method;
  projectName: string;
  hasProjectImage: boolean;
  clientName: string;
  clientEmail: string;
  hasClientAvatar: boolean;
  projectType: ProjectType | null;
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
  if (step === "generating-roadmap") {
    return "preview";
  }

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
  projectType,
  activePhasesLength,
}: Omit<ValidationContext, "startDate" | "endDate">) {
  switch (step) {
    case "welcome":
      return true;
    case "claude":
      return true;
    case "details":
      return setProjectLater || (projectName.trim().length > 0 && clientName.trim().length > 0);
    case "project-type":
      return projectType !== null;
    case "method":
      return method === "manual" ? activePhasesLength >= 2 : method !== null;
    case "timeline":
    case "preview":
    case "integrations":
    case "celebrating":
      return true;
    case "generating-roadmap":
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
      if (clientEmail.trim()) {
        const clientEmailParsed = clientInfoSchema.shape.clientEmail.safeParse(clientEmail);
        if (!clientEmailParsed.success) {
          return clientEmailParsed.error.issues[0]?.message ?? "Please enter a valid email address.";
        }
      }
      return null;
    }
    case "project-type": {
      if (!projectType) {
        return "Choose the project type to continue.";
      }

      const projectTypeParsed = projectTypeValidationSchema.safeParse(projectType);
      return projectTypeParsed.success
        ? null
        : (projectTypeParsed.error.issues[0]?.message ?? "Choose the project type.");
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
    case "generating-roadmap":
    case "creating":
    case "celebrating":
    default:
      return null;
  }
}
