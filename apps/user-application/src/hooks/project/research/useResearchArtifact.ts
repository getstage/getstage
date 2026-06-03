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

function toContentJsonString(contentJson: unknown): string | null {
  if (typeof contentJson === "string") {
    return contentJson.trim() ? contentJson : null;
  }

  if (contentJson && typeof contentJson === "object") {
    return JSON.stringify(contentJson);
  }

  return null;
}

function parseResearchArtifact(contentJson: unknown) {
  const json = toContentJsonString(contentJson);
  if (!json) {
    return null;
  }

  const artifact = parseResearchArtifactContent(json);
  if (!artifact) {
    const issues = formatResearchArtifactParseIssues(json);
    console.error("[research] artifact parse failed", issues.join(", "));
    return null;
  }

  return artifact;
}

export function useResearchArtifact(
  projectId: string | undefined,
  options: { enabled?: boolean } = {},
) {
  const { enabled = true } = options;
  const { isAuthenticated, isLoading: isAuthLoading } = useDesktopAuth();
  const queryEnabled = enabled && isAuthenticated && Boolean(projectId);
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

  const hasStoredContent = Boolean(toContentJsonString(record?.contentJson));
  const parseError = hasStoredContent && data === null;

  return {
    data,
    isLoading: isAuthLoading || (queryEnabled && record === undefined),
    hasArtifact: data !== null,
    parseError,
    parseErrorMessage: parseError
      ? "Saved research exists but could not be loaded. Try running Research again."
      : null,
  };
}
