import {
  moodboardArtifactSchema,
  type MoodboardArtifact,
  type MoodboardImportMode,
  type MoodboardReference,
} from "@stage/data-ops/contracts";
import type { ValidatedMoodboardConfigureInput } from "@/lib/project/moodboardConfigureInput";
import { moodboardImages } from "./assets";
import {
  getDirectionIdForReferenceIndex,
  MOCK_MOODBOARD_GENERATED_AT,
  MOCK_MOODBOARD_PROJECT_ID,
  MOCK_STYLE_GUIDE_ID,
  MOODBOARD_DIRECTION_IDS,
  MOODBOARD_DIRECTION_NAMES,
  MOODBOARD_DIRECTION_REFERENCE_COUNTS,
} from "./constants";
import { defaultStyleGuide } from "./styleGuide";

function buildDirections() {
  return [
    {
      id: MOODBOARD_DIRECTION_IDS.one,
      name: MOODBOARD_DIRECTION_NAMES[0],
      hasStyleGuide: false,
      referenceCount: MOODBOARD_DIRECTION_REFERENCE_COUNTS[0],
    },
    {
      id: MOODBOARD_DIRECTION_IDS.two,
      name: MOODBOARD_DIRECTION_NAMES[1],
      hasStyleGuide: true,
      styleGuideId: MOCK_STYLE_GUIDE_ID,
      referenceCount: MOODBOARD_DIRECTION_REFERENCE_COUNTS[1],
    },
    {
      id: MOODBOARD_DIRECTION_IDS.three,
      name: MOODBOARD_DIRECTION_NAMES[2],
      hasStyleGuide: false,
      referenceCount: MOODBOARD_DIRECTION_REFERENCE_COUNTS[2],
    },
  ];
}

function buildReferences(options: {
  importMode: MoodboardImportMode;
  isInMoodboard?: boolean;
}): MoodboardReference[] {
  return moodboardImages.map((imageUrl, index) => {
    const referenceIndex = index + 1;

    return {
      id: `reference-${referenceIndex}`,
      title: `Reference ${referenceIndex}`,
      imageUrl,
      source: options.importMode === "figma" ? ("figma" as const) : ("upload" as const),
      sourceUrl:
        options.importMode === "figma"
          ? "https://www.figma.com/file/mock-moodboard-reference"
          : undefined,
      directionId: null,
      isInMoodboard: options.isInMoodboard ?? false,
      order: referenceIndex,
    };
  });
}

function buildMoodboardArtifact(
  projectId: string,
  generatedAt: number,
  input?: ValidatedMoodboardConfigureInput,
): MoodboardArtifact {
  const importMode = input?.importMode ?? "upload";
  const uploadedFiles = input?.uploadedFiles ?? [];

  return {
    apiVersion: "v1",
    artifactKind: "moodboardArtifact",
    projectId,
    title: "Project Moodboard",
    importMode,
    directions: buildDirections(),
    references: buildReferences({ importMode, isInMoodboard: false }),
    uploadedFiles,
    styleGuides: [defaultStyleGuide],
    generatedAt,
  };
}

export const mockMoodboardArtifact = moodboardArtifactSchema.parse(
  buildMoodboardArtifact(MOCK_MOODBOARD_PROJECT_ID, MOCK_MOODBOARD_GENERATED_AT),
);

export function createMockMoodboardArtifact(
  projectId: string,
  input?: ValidatedMoodboardConfigureInput,
): MoodboardArtifact {
  return moodboardArtifactSchema.parse(
    buildMoodboardArtifact(projectId, MOCK_MOODBOARD_GENERATED_AT, input),
  );
}
