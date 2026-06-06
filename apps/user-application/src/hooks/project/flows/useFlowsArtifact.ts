import { useMemo } from "react";
import { useQuery } from "convex/react";
import { flowsArtifactSchema, type FlowsArtifact } from "@stage/data-ops/contracts";
import type { Id } from "@stage/data-ops/convex/data-model";
import { useDesktopAuth } from "@/lib/auth";
import { mapFlowsArtifactToTabData } from "@/lib/project/mapFlowsArtifactToTabData";
import { SHOULD_QUERY_PROJECT_AI_ARTIFACTS } from "@/lib/project/shouldQueryProjectAiArtifacts";
import { api } from "@/lib/convexApi";
import type { FlowsArtifactRecord } from "@/types/project/flowsArtifactRecord";

export type { FlowsArtifactRecord } from "@/types/project/flowsArtifactRecord";

function parseFlowsArtifact(contentJson: string | null): FlowsArtifact | null {
  if (!contentJson) {
    return null;
  }

  try {
    const parsed = JSON.parse(contentJson) as unknown;
    return flowsArtifactSchema.parse(parsed);
  } catch {
    return null;
  }
}

export function useFlowsArtifact(
  projectId: string | undefined,
  options: { enabled?: boolean } = {},
) {
  const { enabled = true } = options;
  const { isAuthenticated, isLoading: isAuthLoading } = useDesktopAuth();
  const queryEnabled =
    enabled && SHOULD_QUERY_PROJECT_AI_ARTIFACTS && isAuthenticated && Boolean(projectId);
  const record = useQuery(
    api.projectAi.getLatestFlowsArtifact,
    queryEnabled ? { projectId: projectId as Id<"projects"> } : "skip",
  );

  const data = useMemo<FlowsArtifactRecord | null>(() => {
    if (!record) {
      return null;
    }

    const artifact = parseFlowsArtifact(record.contentJson);
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
      tabData: mapFlowsArtifactToTabData(artifact),
    };
  }, [record]);

  return {
    data,
    isLoading: isAuthLoading || (queryEnabled && record === undefined),
    hasArtifact: data !== null,
    parseError: record !== undefined && record !== null && data === null,
  };
}
