import { useMemo } from "react";
import { useQuery } from "convex/react";
import { assetsArtifactSchema, type AssetsArtifact } from "@stage/data-ops/contracts";
import type { Id } from "@stage/data-ops/convex/data-model";
import { useDesktopAuth } from "@/lib/auth";
import { mapAssetsArtifactToTabData } from "@/lib/project/mapAssetsArtifactToTabData";
import { SHOULD_QUERY_PROJECT_AI_ARTIFACTS } from "@/lib/project/shouldQueryProjectAiArtifacts";
import { api } from "@/lib/convexApi";
import type { AssetsArtifactRecord } from "@/types/project/assetsArtifactRecord";

export type { AssetsArtifactRecord } from "@/types/project/assetsArtifactRecord";

function parseAssetsArtifact(contentJson: string | null): AssetsArtifact | null {
  if (!contentJson) {
    return null;
  }

  try {
    const parsed = JSON.parse(contentJson) as unknown;
    return assetsArtifactSchema.parse(parsed);
  } catch {
    return null;
  }
}

export function useAssetsArtifact(projectId: string | undefined) {
  const { isAuthenticated, isLoading: isAuthLoading } = useDesktopAuth();
  const queryEnabled =
    SHOULD_QUERY_PROJECT_AI_ARTIFACTS && isAuthenticated && Boolean(projectId);
  const record = useQuery(
    api.projectAi.getLatestAssetsArtifact,
    queryEnabled ? { projectId: projectId as Id<"projects"> } : "skip",
  );

  const data = useMemo<AssetsArtifactRecord | null>(() => {
    if (!record) {
      return null;
    }

    const artifact = parseAssetsArtifact(record.contentJson);
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
      tabData: mapAssetsArtifactToTabData(artifact),
    };
  }, [record]);

  return {
    data,
    isLoading: isAuthLoading || (queryEnabled && record === undefined),
    hasArtifact: data !== null,
    parseError: record !== undefined && record !== null && data === null,
  };
}
