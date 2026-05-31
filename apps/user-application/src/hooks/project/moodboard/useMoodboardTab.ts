import { useCallback, useEffect, useState } from "react";
import type { MoodboardInput } from "@stage/data-ops/contracts";
import { moodboardArtifactSchema } from "@stage/data-ops/contracts";
import {
  buildMoodboardInput,
  parseStoredMoodboardConfigureInput,
  type ValidatedMoodboardConfigureInput,
} from "@/lib/project/moodboardConfigureInput";
import { getStyleGuideForDirection } from "@/lib/project/mapMoodboardArtifactToTabData";
import {
  buildMoodboardArtifactRecord,
  delay,
  getMockMoodboardArtifactRecord,
  loadMockMoodboardArtifactRecord,
  MOCK_MOODBOARD_RUN_DELAY_MS,
  MOCK_STYLE_GUIDE_RUN_DELAY_MS,
  saveMockMoodboardArtifactRecord,
  USE_MOCK_MOODBOARD_DATA,
} from "@/mock/project/moodboard";
import { defaultStyleGuide } from "@/mock/project/moodboard";
import type { Project } from "@/models/project/project";
import type { MoodboardArtifactRecord } from "@/types/project/moodboardArtifactRecord";
import { useMoodboardArtifact } from "./useMoodboardArtifact";

const MOODBOARD_INPUT_STORAGE_PREFIX = "stage:moodboard-configure-input:";

function loadStoredMoodboardInput(projectId: string): ValidatedMoodboardConfigureInput | null {
  try {
    const raw = sessionStorage.getItem(`${MOODBOARD_INPUT_STORAGE_PREFIX}${projectId}`);
    if (!raw) {
      return null;
    }

    return parseStoredMoodboardConfigureInput(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

function saveStoredMoodboardInput(projectId: string, input: ValidatedMoodboardConfigureInput) {
  sessionStorage.setItem(`${MOODBOARD_INPUT_STORAGE_PREFIX}${projectId}`, JSON.stringify(input));
}

export function useMoodboardTab(project: Pick<Project, "id" | "name">) {
  const projectId = project.id;
  const moodboardArtifact = useMoodboardArtifact(projectId);
  const [mockRecord, setMockRecord] = useState<MoodboardArtifactRecord | null>(() =>
    loadMockMoodboardArtifactRecord(projectId),
  );
  const [lastInput, setLastInput] = useState<ValidatedMoodboardConfigureInput | null>(() =>
    loadStoredMoodboardInput(projectId),
  );
  const [isMockRunning, setIsMockRunning] = useState(false);
  const [isGeneratingStyleGuide, setIsGeneratingStyleGuide] = useState(false);
  const [mockError, setMockError] = useState<string | null>(null);

  useEffect(() => {
    setMockRecord(loadMockMoodboardArtifactRecord(projectId));
    setLastInput(loadStoredMoodboardInput(projectId));
    setMockError(null);
    setIsMockRunning(false);
    setIsGeneratingStyleGuide(false);
  }, [projectId]);

  const backendData = moodboardArtifact.data;
  const data = backendData ?? mockRecord;
  const usingMockData = backendData === null && mockRecord !== null;

  const startMockMoodboard = useCallback(
    async (input: ValidatedMoodboardConfigureInput) => {
      setMockError(null);
      setIsMockRunning(true);

      try {
        await delay(MOCK_MOODBOARD_RUN_DELAY_MS);
        const record = getMockMoodboardArtifactRecord(projectId, input);
        setMockRecord(record);
        saveMockMoodboardArtifactRecord(projectId, record);
      } catch (error) {
        setMockError(error instanceof Error ? error.message : "Could not finish mock Moodboard import.");
      } finally {
        setIsMockRunning(false);
      }
    },
    [projectId],
  );

  const startMoodboard = useCallback(
    async (input?: ValidatedMoodboardConfigureInput) => {
      const resolvedInput = input ?? lastInput;
      if (!resolvedInput) {
        throw new Error("Configure Moodboard before importing references.");
      }

      const moodboardInput: MoodboardInput = buildMoodboardInput(project, resolvedInput);

      setLastInput(resolvedInput);
      saveStoredMoodboardInput(projectId, resolvedInput);

      if (USE_MOCK_MOODBOARD_DATA && !backendData) {
        await startMockMoodboard(resolvedInput);
        return moodboardInput;
      }

      throw new Error("Moodboard engine is not connected yet.");
    },
    [backendData, lastInput, project, projectId, startMockMoodboard],
  );

  const generateStyleGuide = useCallback(
    async (directionId: string) => {
      if (!data) {
        throw new Error("Create a moodboard before generating a style guide.");
      }

      setIsGeneratingStyleGuide(true);
      try {
        await delay(MOCK_STYLE_GUIDE_RUN_DELAY_MS);

        if (usingMockData && mockRecord) {
          const styleGuideId = `style-guide-${directionId}`;
          const existingGuide = getStyleGuideForDirection(mockRecord.tabData, directionId);
          const nextGuide = existingGuide ?? {
            ...defaultStyleGuide,
            id: styleGuideId,
            directionId,
          };

          const artifact = moodboardArtifactSchema.parse({
            ...mockRecord.artifact,
            directions: mockRecord.artifact.directions.map((direction) =>
              direction.id === directionId
                ? { ...direction, hasStyleGuide: true, styleGuideId: nextGuide.id }
                : direction,
            ),
            styleGuides: existingGuide
              ? mockRecord.artifact.styleGuides
              : [...mockRecord.artifact.styleGuides, nextGuide],
          });

          const updatedRecord = buildMoodboardArtifactRecord(projectId, artifact, mockRecord.id);
          setMockRecord(updatedRecord);
          saveMockMoodboardArtifactRecord(projectId, updatedRecord);
        }
      } finally {
        setIsGeneratingStyleGuide(false);
      }
    },
    [data, mockRecord, projectId, usingMockData],
  );

  return {
    data,
    isLoading: moodboardArtifact.isLoading,
    hasArtifact: data !== null,
    parseError: moodboardArtifact.parseError,
    usingMockData,
    lastInput,
    startMoodboard,
    generateStyleGuide,
    isRunning: isMockRunning,
    isStarting: isMockRunning,
    isGeneratingStyleGuide,
    error: mockError,
  };
}
