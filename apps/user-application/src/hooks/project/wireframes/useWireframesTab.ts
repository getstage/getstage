import { useCallback, useEffect, useState } from "react";
import type { WireframeBrandSource, WireframeKind } from "@stage/data-ops/contracts";
import {
  buildWireframesArtifactFromSelection,
  buildWireframesArtifactRecord,
  delay,
  getMockWireframesArtifactRecord,
  loadMockWireframesArtifactRecord,
  MOCK_WIREFRAMES_RUN_DELAY_MS,
  saveMockWireframesArtifactRecord,
} from "@/mock/project/wireframes";
import type { Project } from "@/models/project/project";
import type { ScreenItem } from "@/types/project/wireframesTab";
import type { WireframesArtifactRecord } from "@/types/project/wireframesArtifactRecord";
import { useWireframesArtifact } from "./useWireframesArtifact";

export function useWireframesTab(project: Pick<Project, "id" | "name">) {
  const projectId = project.id;
  const wireframesArtifact = useWireframesArtifact(projectId);
  const [mockRecord, setMockRecord] = useState<WireframesArtifactRecord | null>(() =>
    loadMockWireframesArtifactRecord(projectId),
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [mockError, setMockError] = useState<string | null>(null);

  useEffect(() => {
    setMockRecord(loadMockWireframesArtifactRecord(projectId));
    setMockError(null);
    setIsGenerating(false);
  }, [projectId]);

  const backendData = wireframesArtifact.data;
  const data = backendData ?? mockRecord;
  const usingMockData = backendData === null && mockRecord !== null;

  const generateWireframes = useCallback(
    async (input: {
      wireframeKind: WireframeKind;
      brandSource: WireframeBrandSource | null;
      screens: ScreenItem[];
    }) => {
      setMockError(null);
      setIsGenerating(true);

      try {
        await delay(MOCK_WIREFRAMES_RUN_DELAY_MS);
        const artifact = buildWireframesArtifactFromSelection({
          projectId,
          wireframeKind: input.wireframeKind,
          brandSource: input.brandSource,
          screens: input.screens,
        });
        const record = buildWireframesArtifactRecord(projectId, artifact);
        setMockRecord(record);
        saveMockWireframesArtifactRecord(projectId, record);
        return record;
      } catch (error) {
        setMockError(error instanceof Error ? error.message : "Could not finish mock wireframe generation.");
        throw error;
      } finally {
        setIsGenerating(false);
      }
    },
    [projectId],
  );

  return {
    data,
    isLoading: wireframesArtifact.isLoading,
    hasArtifact: data !== null,
    parseError: wireframesArtifact.parseError,
    usingMockData,
    generateWireframes,
    isGenerating,
    error: mockError,
    seedMockRecord: () => {
      const record = getMockWireframesArtifactRecord(projectId);
      setMockRecord(record);
      saveMockWireframesArtifactRecord(projectId, record);
      return record;
    },
  };
}
