import { useMemo } from "react";
import { useQuery } from "convex/react";
import { researchArtifactSchema, type ResearchArtifact } from "@stage/data-ops/contracts";
import type { Id } from "@stage/data-ops/convex/data-model";
import { useDesktopAuth } from "@/lib/auth";
import { mapResearchArtifactToTabData } from "@/lib/project/mapResearchArtifactToTabData";
import { api } from "@/lib/convexApi";
import type { ResearchTabData } from "@/types/project/researchTab";

export type ResearchArtifactRecord = {
  id: string;
  projectId: string;
  runId: string | null;
  title: string;
  summary: string | null;
  status: string;
  createdAt: number;
  updatedAt: number;
  artifact: ResearchArtifact;
  tabData: ResearchTabData;
};

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
  const record = useQuery(
    api.projectAi.getLatestResearchArtifact,
    isAuthenticated && projectId ? { projectId: projectId as Id<"projects"> } : "skip",
  );

  const data = useMemo<ResearchArtifactRecord | null>(() => {
    if (!record) {
      return null;
    }

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
  }, [record]);

  return {
    data,
    isLoading: isAuthLoading || (isAuthenticated && Boolean(projectId) && record === undefined),
    hasArtifact: data !== null,
    parseError: record !== undefined && record !== null && data === null,
  };
}
