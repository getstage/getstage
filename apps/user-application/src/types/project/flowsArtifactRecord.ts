import type { FlowsArtifact } from "@stage/data-ops/contracts";
import type { FlowsTabData } from "@/types/project/flowsTab";

export type FlowsArtifactRecord = {
  id: string;
  projectId: string;
  runId: string | null;
  title: string;
  summary: string | null;
  status: string;
  createdAt: number;
  updatedAt: number;
  artifact: FlowsArtifact;
  tabData: FlowsTabData;
};
