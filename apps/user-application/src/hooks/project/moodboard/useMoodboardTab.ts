import { useCallback, useEffect, useState } from "react";
import type { MoodboardInput } from "@stage/data-ops/contracts";
import {
  buildMoodboardInput,
  parseStoredMoodboardConfigureInput,
  type ValidatedMoodboardConfigureInput,
} from "@/lib/project/moodboardConfigureInput";
import {
  delay,
  MOCK_STYLE_GUIDE_RUN_DELAY_MS,
} from "@/mock/project/moodboard";
import type { Project } from "@/models/project/project";
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
  const [lastInput, setLastInput] = useState<ValidatedMoodboardConfigureInput | null>(() =>
    loadStoredMoodboardInput(projectId),
  );
  const [isGeneratingStyleGuide, setIsGeneratingStyleGuide] = useState(false);
  const [mockError, setMockError] = useState<string | null>(null);

  useEffect(() => {
    setLastInput(loadStoredMoodboardInput(projectId));
    setMockError(null);
    setIsGeneratingStyleGuide(false);
  }, [projectId]);

  const backendData = moodboardArtifact.data;
  const data = backendData;

  const startMoodboard = useCallback(
    async (input?: ValidatedMoodboardConfigureInput) => {
      const resolvedInput = input ?? lastInput;
      if (!resolvedInput) {
        throw new Error("Configure Moodboard before importing references.");
      }

      const moodboardInput: MoodboardInput = buildMoodboardInput(project, resolvedInput);

      setLastInput(resolvedInput);
      saveStoredMoodboardInput(projectId, resolvedInput);

      throw new Error("Moodboard engine is not connected yet.");
    },
    [lastInput, project, projectId],
  );

  const generateStyleGuide = useCallback(
    async (directionId: string) => {
      if (!data) {
        throw new Error("Create a moodboard before generating a style guide.");
      }

      setIsGeneratingStyleGuide(true);
      try {
        await delay(MOCK_STYLE_GUIDE_RUN_DELAY_MS);
      } finally {
        setIsGeneratingStyleGuide(false);
      }
    },
    [data],
  );

  return {
    data,
    isLoading: moodboardArtifact.isLoading,
    hasArtifact: data !== null,
    parseError: moodboardArtifact.parseError,
    usingMockData: false,
    lastInput,
    startMoodboard,
    generateStyleGuide,
    isRunning: false,
    isStarting: false,
    isGeneratingStyleGuide,
    error: mockError,
  };
}
