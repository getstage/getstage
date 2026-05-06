import type { ProjectType } from "@/types";

export type OnboardingStepId =
  | "welcome"
  | "personalise"
  | "claude"
  | "details"
  | "client"
  | "project-type"
  | "method"
  | "phase-select"
  | "timeline"
  | "generating-roadmap"
  | "preview"
  | "integrations"
  | "creating"
  | "celebrating"
  | "paywall";

export type OnboardingFlowState = {
  step: OnboardingStepId;
  isClosing: boolean;
  creationReady: boolean;
};

export type OnboardingSubmission = {
  fieldOfWork: ProjectType;
  fieldOfWorkSelections: ProjectType[];
  createProject: boolean;
  projectName: string;
  projectImageUrl: string | null;
  clientName: string;
  clientEmail: string;
  clientAvatarUrl: string | null;
  projectType: ProjectType;
  csvConnected: boolean;
  csvImported: boolean;
  stripeConnected: boolean;
};
