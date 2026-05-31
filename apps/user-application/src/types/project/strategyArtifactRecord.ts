import type { StrategyArtifact } from "@stage/data-ops/contracts";
import type { StrategyTabData } from "@/types/project/strategyTab";

export type StrategyArtifactRecord = {
  id: string;
  projectId: string;
  runId: string | null;
  title: string;
  summary: string | null;
  status: string;
  createdAt: number;
  updatedAt: number;
  artifact: StrategyArtifact;
  tabData: StrategyTabData;
};
