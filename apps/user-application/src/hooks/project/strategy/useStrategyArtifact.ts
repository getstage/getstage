import { useMemo } from "react";
import { useQuery } from "convex/react";
import { strategyArtifactSchema, type StrategyArtifact } from "@stage/data-ops/contracts";
import type { Id } from "@stage/data-ops/convex/data-model";
import { useDesktopAuth } from "@/lib/auth";
import { mapStrategyArtifactToTabData } from "@/lib/project/mapStrategyArtifactToTabData";
import { api } from "@/lib/convexApi";
import type { StrategyArtifactRecord } from "@/types/project/strategyArtifactRecord";

export type { StrategyArtifactRecord } from "@/types/project/strategyArtifactRecord";

function parseStrategyArtifact(contentJson: string | null): StrategyArtifact | null {
  if (!contentJson) {
    return null;
  }

  try {
    const parsed = JSON.parse(contentJson) as unknown;
    return strategyArtifactSchema.parse(parsed);
  } catch {
    return null;
  }
}

export function useStrategyArtifact(
  projectId: string | undefined,
  options: { enabled?: boolean } = {},
) {
  const { enabled = true } = options;
  const { isAuthenticated, isLoading: isAuthLoading } = useDesktopAuth();
  const queryEnabled = enabled && isAuthenticated && Boolean(projectId);
  const record = useQuery(
    api.projectAi.getLatestStrategyArtifact,
    queryEnabled ? { projectId: projectId as Id<"projects"> } : "skip",
  );

  const data = useMemo<StrategyArtifactRecord | null>(() => {
    if (!record) {
      return null;
    }

    const artifact = parseStrategyArtifact(record.contentJson);
    if (!artifact) {
      return null;
    }

    return {
      id: record.id,
      projectId: record.projectId,
      runId: record.runId,
      title: record.title,
      summary: record.summary,
      status: record.status,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      artifact,
      tabData: mapStrategyArtifactToTabData(artifact),
    };
  }, [record]);

  return {
    data,
    isLoading: isAuthLoading || (queryEnabled && record === undefined),
    hasArtifact: data !== null,
    parseError: record !== undefined && record !== null && data === null,
  };
}
