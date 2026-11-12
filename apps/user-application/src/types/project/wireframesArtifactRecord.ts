import type { WireframesArtifact } from "@stage/data-ops/contracts";
import type { WireframesTabData } from "@stage/project-ui/wireframes";

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
  tabData: WireframesTabData;
};
