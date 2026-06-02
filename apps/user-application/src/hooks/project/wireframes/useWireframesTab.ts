import { useCallback, useEffect, useState } from "react";
import type { WireframeBrandSource, WireframeKind } from "@stage/data-ops/contracts";
import type { Project } from "@/models/project/project";
import type { ScreenItem } from "@/types/project/wireframesTab";
import type { WireframesArtifactRecord } from "@/types/project/wireframesArtifactRecord";
import { useWireframesArtifact } from "./useWireframesArtifact";

export function useWireframesTab(project: Pick<Project, "id" | "name">) {
  const projectId = project.id;
  const wireframesArtifact = useWireframesArtifact(projectId);
  const [isGenerating, setIsGenerating] = useState(false);
  const [mockError, setMockError] = useState<string | null>(null);

  useEffect(() => {
    setMockError(null);
    setIsGenerating(false);
  }, [projectId]);

  const backendData = wireframesArtifact.data;
  const data = backendData;

  const generateWireframes = useCallback(
    async (input: {
      wireframeKind: WireframeKind;
      brandSource: WireframeBrandSource | null;
      screens: ScreenItem[];
    }): Promise<WireframesArtifactRecord> => {
      void input;
      setMockError(null);
      setIsGenerating(true);

      try {
        throw new Error("Wireframes engine is not connected yet.");
      } catch (error) {
        setMockError(error instanceof Error ? error.message : "Could not finish wireframe generation.");
        throw error;
      } finally {
        setIsGenerating(false);
      }
    },
    [],
  );

  return {
    data,
    isLoading: wireframesArtifact.isLoading,
    hasArtifact: data !== null,
    parseError: wireframesArtifact.parseError,
    usingMockData: false,
    generateWireframes,
    isGenerating,
    error: mockError,
  };
}
