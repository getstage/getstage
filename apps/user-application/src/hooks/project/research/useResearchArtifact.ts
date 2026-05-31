import { useMemo } from "react";
import { useQuery } from "convex/react";
import { researchArtifactSchema, type ResearchArtifact } from "@stage/data-ops/contracts";
import type { Id } from "@stage/data-ops/convex/data-model";
import { useDesktopAuth } from "@/lib/auth";
import { mapResearchArtifactToTabData } from "@/lib/project/mapResearchArtifactToTabData";
import { SHOULD_QUERY_PROJECT_AI_ARTIFACTS } from "@/lib/project/shouldQueryProjectAiArtifacts";
import { api } from "@/lib/convexApi";
import type { ResearchArtifactRecord } from "@/types/project/researchArtifactRecord";

export type { ResearchArtifactRecord } from "@/types/project/researchArtifactRecord";

function parseResearchArtifact(contentJson: string | null): ResearchArtifact | null {
  if (!contentJson) {
    return null;
  }

  try {
    const parsed = JSON.parse(contentJson) as unknown;
    return researchArtifactSchema.parse(parsed);
  } catch {
    return null;
  }
}

export function useResearchArtifact(projectId: string | undefined) {
  const { isAuthenticated, isLoading: isAuthLoading } = useDesktopAuth();
  const queryEnabled =
    SHOULD_QUERY_PROJECT_AI_ARTIFACTS && isAuthenticated && Boolean(projectId);
  const record = useQuery(
    api.projectAi.getLatestResearchArtifact,
    queryEnabled ? { projectId: projectId as Id<"projects"> } : "skip",
  );

  const data = useMemo<ResearchArtifactRecord | null>(() => {
    if (record) {
      const artifact = parseResearchArtifact(record.contentJson);
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
        tabData: mapResearchArtifactToTabData(artifact),
      };
    }

    return null;
  }, [record]);

  return {
    data,
    isLoading: isAuthLoading || (queryEnabled && record === undefined),
    hasArtifact: data !== null,
    parseError: record !== undefined && record !== null && data === null,
  };
}
