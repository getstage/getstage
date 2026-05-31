export const MOODBOARD_DIRECTION_IDS = {
  one: "direction-1",
  two: "direction-2",
  three: "direction-3",
} as const;

export const MOODBOARD_DIRECTION_NAMES = ["Direction 1", "Direction 2", "Direction 3"] as const;

export const MOODBOARD_DIRECTION_REFERENCE_COUNTS = [24, 12, 43] as const;

export const MOCK_STYLE_GUIDE_ID = "style-guide-direction-2";

export const MOCK_MOODBOARD_PROJECT_ID = "mock-stellar-site";

export const MOCK_MOODBOARD_GENERATED_AT = Date.parse("2025-04-06T16:00:00.000Z");

export const DEFAULT_SELECTED_REFERENCE_IDS = ["reference-1", "reference-2"] as const;

/** Shown in the upload file list UI after the user uploads from device. */
export const mockUploadedFiles = [
  { id: "upload-1", name: "Example.fig", sizeBytes: 2_300_000 },
  { id: "upload-2", name: "Homepage inspiration.png", sizeBytes: 1_200_000 },
] as const;

export function getDirectionFolderName(referenceIndex: number): (typeof MOODBOARD_DIRECTION_NAMES)[number] {
  if (referenceIndex <= 2) {
    return MOODBOARD_DIRECTION_NAMES[0];
  }

  if (referenceIndex <= 4) {
    return MOODBOARD_DIRECTION_NAMES[1];
  }

  return MOODBOARD_DIRECTION_NAMES[2];
}

export function getDirectionIdForReferenceIndex(referenceIndex: number): string {
  if (referenceIndex <= 2) {
    return MOODBOARD_DIRECTION_IDS.one;
  }

  if (referenceIndex <= 4) {
    return MOODBOARD_DIRECTION_IDS.two;
  }

  return MOODBOARD_DIRECTION_IDS.three;
}

export function formatUploadedFileSize(sizeBytes: number) {
  if (sizeBytes >= 1_000_000) {
    return `${(sizeBytes / 1_000_000).toFixed(1)}MB`;
  }

  return `${Math.max(1, Math.round(sizeBytes / 1000))}KB`;
}

export function getStyleDirectionSummaries() {
  return MOODBOARD_DIRECTION_NAMES.map((title, index) => ({
    id: index + 1,
    title,
    count: MOODBOARD_DIRECTION_REFERENCE_COUNTS[index] ?? 0,
  }));
}
