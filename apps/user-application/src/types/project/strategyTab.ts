import type { StrategySection, StrategySectionStatus } from "@stage/data-ops/contracts";

export type { StrategySection, StrategySectionStatus };
export type SectionStatus = StrategySectionStatus;

export type StrategyTabData = {
  sections: StrategySection[];
};
