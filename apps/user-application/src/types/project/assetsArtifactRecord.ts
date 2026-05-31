import type { AssetsArtifact } from "@stage/data-ops/contracts";
import type { AssetsTabData } from "@/types/project/assetsTab";

export type AssetsArtifactRecord = {
  id: string;
  projectId: string;
  runId: string | null;
  title: string;
  summary: string | null;
  status: string;
  createdAt: number;
  updatedAt: number;
  artifact: AssetsArtifact;
  tabData: AssetsTabData;
};
