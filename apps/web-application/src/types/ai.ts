export type ProjectAiModule = "research" | "strategy" | "flows" | "moodboard" | "styleguide" | "generate" | "delivery";

export type ProjectAiContext = {
  projectId: string;
  userId: string;
  clientWebsite: string;
  competitorUrls: string[];
  referenceUrls: string[];
  brief: string;
  briefAttachmentName: string | null;
  briefAttachmentR2ObjectKey: string | null;
  briefAttachmentUrl: string | null;
  notes: string;
  updatedAt: number | null;
};

export type ProjectAiRun = {
  id: string;
  projectId: string;
  connectionId: string | null;
  module: ProjectAiModule;
  title: string;
  status: "draft" | "running" | "completed" | "failed" | "cancelled" | "needs_input";
  trigger: "user" | "agent";
  externalRunId: string | null;
  inputSummary: string | null;
  errorMessage: string | null;
  startedAt: number;
  completedAt: number | null;
  updatedAt: number;
};

export type ArtifactDestination = {
  id: string;
  provider: "notion" | "figma";
  action: string;
  status: "requested" | "in_progress" | "completed" | "failed";
  destinationLabel: string | null;
  destinationUrl: string | null;
  errorMessage: string | null;
  lastSyncedAt: number | null;
  createdAt: number;
  updatedAt: number;
};

export type ProjectAiArtifact = {
  id: string;
  projectId: string;
  runId: string | null;
  module: ProjectAiModule;
  kind: string;
  title: string;
  summary: string | null;
  status: "draft" | "ready" | "approved" | "superseded" | "failed";
  contentFormat: "markdown" | "json" | "link_set";
  contentMarkdown: string | null;
  contentJson: string | null;
  externalUrl: string | null;
  createdAt: number;
  updatedAt: number;
  approvedAt: number | null;
  destinations: ArtifactDestination[];
};
