import type { StrategyArtifact } from "@stage/data-ops/contracts";
import type { StrategyTabData } from "@/types/project/strategyTab";

export function mapStrategyArtifactToTabData(artifact: StrategyArtifact): StrategyTabData {
  return {
    sections: artifact.sections,
  };
}
