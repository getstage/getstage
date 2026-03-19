import {
  clientInfoSchema,
  dateRangeInputSchema,
  manualPhaseSelectionSchema,
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
  method,
  setProjectLater,
}: {
  method: Method;
  setProjectLater: boolean;
}): OnboardingStepId[] {
  if (setProjectLater) {
    return ["welcome", "personalise", "details", "integrations"];
  }

  if (method === "manual") {
    return [
      "welcome",
      "personalise",
      "details",
      "client",
      "project-type",
      "method",
      "phase-select",
      "timeline",
      "preview",
      "integrations",
    ];
  }

  return [
    "welcome",
    "personalise",
    "details",
    "client",
    "project-type",
    "method",
    "timeline",
    "preview",
    "integrations",
  ];
}

export function getCurrentStepForProgress(step: OnboardingStepId) {
  if (step === "generating-roadmap") {
    return "preview";
  }

  if (step === "creating" || step === "celebrating" || step === "paywall") {
    return "integrations";
  }

  return step;
}

export function canContinue({
  step,
  fieldOfWork,
  setProjectLater,
  method,
  projectName,
  clientName,
  clientEmail,
  hasClientAvatar,
  projectType,
  activePhasesLength,
}: Omit<ValidationContext, "startDate" | "endDate">) {
  switch (step) {
    case "welcome":
      return true;
    case "personalise":
      return fieldOfWork.length > 0;
    case "details":
      return setProjectLater || projectName.trim().length > 0;
    case "client":
      return clientName.trim().length > 0 && clientEmail.trim().length > 0 && hasClientAvatar;
    case "project-type":
      return projectType !== null;
    case "method":
      return method !== null;
    case "phase-select":
      return activePhasesLength >= 2;
    case "timeline":
    case "preview":
    case "integrations":
      return true;
    case "generating-roadmap":
    case "creating":
    case "celebrating":
      return false;
    default:
      return false;
  }
}

export function getStepValidationError({
  step,
  fieldOfWork,
  setProjectLater,
  method,
  projectName,
  clientName,
  clientEmail,
  hasClientAvatar,
  projectType,
  activePhasesLength,
  startDate,
  endDate,
}: ValidationContext) {
  switch (step) {
    case "welcome":
      return null;
    case "personalise": {
      if (fieldOfWork.length === 0) {
        return "Choose at least one field of work to continue.";
      }

      const hasInvalidSelection = fieldOfWork.some(
        (selectedField) => !projectTypeValidationSchema.safeParse(selectedField).success,
      );
      return hasInvalidSelection ? "Choose a valid field of work." : null;
    }
    case "details": {
      if (setProjectLater) {
        return null;
      }

      const basicsParsed = projectBasicsSchema.safeParse({ projectName });
      if (!basicsParsed.success) {
        return basicsParsed.error.issues[0]?.message ?? "Please enter a project name.";
      }
      return null;
    }
    case "client": {
      const clientParsed = clientInfoSchema.safeParse({ clientName, clientEmail });
      if (!clientParsed.success) {
        return clientParsed.error.issues[0]?.message ?? "Please complete the client details.";
      }
      if (!hasClientAvatar) {
        return "Please upload a client photo.";
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
      return method ? null : "Choose how you want to build your roadmap.";
    case "phase-select": {
      const parsed = manualPhaseSelectionSchema.safeParse(activePhasesLength);
      return parsed.success
        ? null
        : (parsed.error.issues[0]?.message ?? "Select at least two phases.");
    }
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
