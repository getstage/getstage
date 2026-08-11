import type { WireframesArtifact } from "@stage/data-ops/contracts";
import type { WireframesTabData } from "@/types/project/wireframesTab";

export type WireframesArtifactRecord = {
  id: string;
  projectId: string;
  runId: string | null;
  title: string;
  summary: string | null;
  status: string;
  createdAt: number;
  updatedAt: number;
  artifact: WireframesArtifact;
  // The run stylesheet fetched back from R2. Null for Lo-Fi runs and for
  // artifacts saved before the offload, whose fragments embed their own CSS.
  resolvedCss: string | null;
  tabData: WireframesTabData;
};
