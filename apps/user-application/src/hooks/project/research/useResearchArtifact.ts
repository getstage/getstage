import { useMemo } from "react";
import { useQuery } from "convex/react";
import {
  formatResearchArtifactParseIssues,
  parseResearchArtifactContent,
} from "@stage/data-ops/contracts";
import type { Id } from "@stage/data-ops/convex/data-model";
import { useDesktopAuth } from "@/lib/auth";
import { mapResearchArtifactToTabData } from "@/lib/project/mapResearchArtifactToTabData";
import { api } from "@/lib/convexApi";
import type { ResearchArtifactRecord } from "@/types/project/researchArtifactRecord";

export type { ResearchArtifactRecord } from "@/types/project/researchArtifactRecord";

function parseResearchArtifact(contentJson: string | null) {
  if (!contentJson?.trim()) {
    return null;
  }

  const artifact = parseResearchArtifactContent(contentJson);
  if (!artifact) {
    const issues = formatResearchArtifactParseIssues(contentJson);
    console.error("[research] artifact parse failed", issues);
    return null;
  }

  return artifact;
}

export function useResearchArtifact(projectId: string | undefined) {
  const { isAuthenticated, isLoading: isAuthLoading } = useDesktopAuth();
  const queryEnabled = isAuthenticated && Boolean(projectId);
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

  const hasStoredContent = Boolean(record?.contentJson?.trim());

  return {
    data,
    isLoading: isAuthLoading || (queryEnabled && record === undefined),
    hasArtifact: data !== null,
    parseError: hasStoredContent && data === null,
  };
}
