import { useMemo } from "react";
import { useQuery } from "convex/react";
import { moodboardArtifactSchema, type MoodboardArtifact } from "@stage/data-ops/contracts";
import type { Id } from "@stage/data-ops/convex/data-model";
import { useDesktopAuth } from "@/lib/auth";
import { mapMoodboardArtifactToTabData } from "@/lib/project/mapMoodboardArtifactToTabData";
import { SHOULD_QUERY_PROJECT_AI_ARTIFACTS } from "@/lib/project/shouldQueryProjectAiArtifacts";
import { api } from "@/lib/convexApi";
import type { MoodboardArtifactRecord } from "@/types/project/moodboardArtifactRecord";

export type { MoodboardArtifactRecord } from "@/types/project/moodboardArtifactRecord";

function parseMoodboardArtifact(contentJson: string | null): MoodboardArtifact | null {
  if (!contentJson) {
    return null;
  }

  try {
    const parsed = JSON.parse(contentJson) as unknown;
    return moodboardArtifactSchema.parse(parsed);
  } catch {
    return null;
  }
}

export function useMoodboardArtifact(
  projectId: string | undefined,
  options: { enabled?: boolean } = {},
) {
  const { enabled = true } = options;
  const { isAuthenticated, isLoading: isAuthLoading } = useDesktopAuth();
  const queryEnabled =
    enabled && SHOULD_QUERY_PROJECT_AI_ARTIFACTS && isAuthenticated && Boolean(projectId);
  const record = useQuery(
    api.projectAi.getLatestMoodboardArtifact,
    queryEnabled ? { projectId: projectId as Id<"projects"> } : "skip",
  );

  const data = useMemo<MoodboardArtifactRecord | null>(() => {
    if (!record) {
      return null;
    }

    const artifact = parseMoodboardArtifact(record.contentJson);
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
      tabData: mapMoodboardArtifactToTabData(artifact),
    };
  }, [record]);

  return {
    data,
    isLoading: isAuthLoading || (queryEnabled && record === undefined),
    hasArtifact: data !== null,
    parseError: record !== undefined && record !== null && data === null,
  };
}
