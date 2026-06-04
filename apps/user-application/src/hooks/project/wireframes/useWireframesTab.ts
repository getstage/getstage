import { useCallback, useEffect, useState } from "react";
import type { ProviderId, WireframeBrandSource, WireframeKind } from "@stage/data-ops/contracts";
import { useProjectAiProvider } from "@/hooks/project/useProjectAiProvider";
import type { Project } from "@/models/project/project";
import type { ScreenItem } from "@/types/project/wireframesTab";
import type { WireframesArtifactRecord } from "@/types/project/wireframesArtifactRecord";
import { useWireframesArtifact } from "./useWireframesArtifact";
import { useWireframesRun } from "./useWireframesRun";

function buildRunSource(kind: WireframeKind, brandSource: WireframeBrandSource | null): string {
  const tokens = [`kind:${kind}`];
  if (brandSource) {
    tokens.push(`brand:${brandSource}`);
  }
  return tokens.join(",");
}

export function useWireframesTab(project: Pick<Project, "id" | "name">) {
  const projectId = project.id;
  const wireframesArtifact = useWireframesArtifact(projectId);
  const wireframesRun = useWireframesRun(projectId);
  const { resolvedProviderId } = useProjectAiProvider(projectId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
  }, [projectId]);

  const generateWireframes = useCallback(
    async (input: {
      wireframeKind: WireframeKind;
      brandSource: WireframeBrandSource | null;
      screens: ScreenItem[];
      providerId?: ProviderId;
    }): Promise<WireframesArtifactRecord | null> => {
      setError(null);
      void input.screens;

      const runProviderId = input.providerId ?? resolvedProviderId;
      if (!runProviderId) {
        const message = "Connect Claude or Codex in Settings before generating Wireframes.";
        setError(message);
        throw new Error(message);
      }

      try {
        await wireframesRun.startWireframes(
          runProviderId,
          buildRunSource(input.wireframeKind, input.brandSource),
        );
      } catch (runError) {
        const message =
          runError instanceof Error ? runError.message : "Could not start wireframes run.";
        setError(message);
        throw runError;
      }

      return wireframesArtifact.data;
    },
    [resolvedProviderId, wireframesArtifact.data, wireframesRun],
  );

  return {
    data: wireframesArtifact.data,
    isLoading: wireframesArtifact.isLoading,
    hasArtifact: wireframesArtifact.data !== null,
    parseError: wireframesArtifact.parseError,
    usingMockData: false,
    generateWireframes,
    isGenerating: wireframesRun.isRunning || wireframesRun.isStarting,
    isRunning: wireframesRun.isRunning,
    error: error ?? wireframesRun.error,
    cancelWireframes: wireframesRun.cancelWireframes,
    activeRunId: wireframesRun.activeRunId,
  };
}
