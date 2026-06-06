import { useMemo } from "react";
import { useQuery } from "convex/react";
import { wireframesArtifactSchema, type WireframesArtifact } from "@stage/data-ops/contracts";
import type { Id } from "@stage/data-ops/convex/data-model";
import { useDesktopAuth } from "@/lib/auth";
import { mapWireframesArtifactToTabData } from "@/lib/project/mapWireframesArtifactToTabData";
import { SHOULD_QUERY_PROJECT_AI_ARTIFACTS } from "@/lib/project/shouldQueryProjectAiArtifacts";
import { api } from "@/lib/convexApi";
import type { WireframesArtifactRecord } from "@/types/project/wireframesArtifactRecord";

export type { WireframesArtifactRecord } from "@/types/project/wireframesArtifactRecord";

function parseWireframesArtifact(contentJson: string | null): WireframesArtifact | null {
  if (!contentJson) {
    return null;
  }

  try {
    const parsed = JSON.parse(contentJson) as unknown;
    return wireframesArtifactSchema.parse(parsed);
  } catch {
    return null;
  }
}

export function useWireframesArtifact(
  projectId: string | undefined,
  options: { enabled?: boolean } = {},
) {
  const { enabled = true } = options;
  const { isAuthenticated, isLoading: isAuthLoading } = useDesktopAuth();
  const queryEnabled =
    enabled && SHOULD_QUERY_PROJECT_AI_ARTIFACTS && isAuthenticated && Boolean(projectId);
  const record = useQuery(
    api.projectAi.getLatestWireframesArtifact,
    queryEnabled ? { projectId: projectId as Id<"projects"> } : "skip",
  );

  const data = useMemo<WireframesArtifactRecord | null>(() => {
    if (!record) {
      return null;
    }

    const artifact = parseWireframesArtifact(record.contentJson);
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
      tabData: mapWireframesArtifactToTabData(artifact),
    };
  }, [record]);

  return {
    data,
    isLoading: isAuthLoading || (queryEnabled && record === undefined),
    hasArtifact: data !== null,
    parseError: record !== undefined && record !== null && data === null,
  };
}
