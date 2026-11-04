import type { ProjectCategory, ProjectType } from "@/types";

export type OnboardingStepId =
  | "welcome"
  | "tech-stack"
  | "questions"
  | "workspace"
  | "project"
  | "personalise"
  | "claude"
  | "details"
  | "client"
  | "project-type"
  | "method"
  | "phase-select"
  | "timeline"
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
  projectType: ProjectCategory;
  csvConnected: boolean;
  csvImported: boolean;
  stripeConnected: boolean;
};

// STA-64 answers on the first screens of the Mac onboarding.
export type OnboardingAnswers = {
  discoverySource: string | null;
  discoveryHandle: string;
  workMode: "solo" | "team";
  buildFor: "client" | "own";
  workspaceName: string;
  inviteEmails: string[];
  startFrom: "idea" | "brief" | "site";
  projectDescription: string;
};
