import type { ResearchArtifact } from "@stage/data-ops/contracts";
import type { ResearchTabData } from "@/types/project/researchTab";

export type ResearchArtifactRecord = {
  id: string;
  projectId: string;
  runId: string | null;
  title: string;
  summary: string | null;
  status: string;
  createdAt: number;
  updatedAt: number;
  artifact: ResearchArtifact;
  tabData: ResearchTabData;
};
