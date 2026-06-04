import { moodboardImages } from "./assets";
import {
  DEFAULT_SELECTED_REFERENCE_IDS,
  getDirectionFolderName,
  MOODBOARD_DIRECTION_NAMES,
} from "./constants";

export type MoodboardMode = "upload" | "figma" | "ai";

/** UI-local moodboard item used by tab components before artifact hydration. */
export type MoodboardFixtureItem = {
  id: string;
  title?: string;
  image: string;
  imageUrl?: string;
  imageAssetKey?: string;
  thumbnailUrl?: string;
  thumbnailAssetKey?: string;
  source?: "upload" | "figma" | "url";
  sourceUrl?: string;
  uploadedAssetId?: string;
  folder: string | null;
  directionId?: string | null;
  isInMoodboard: boolean;
};

export type MoodboardDirectionFixture = {
  name: string;
  hasStyleGuide?: boolean;
};

export function createSeedReferences(): MoodboardFixtureItem[] {
  return moodboardImages.map((image, index) => ({
    id: `reference-${index + 1}`,
    image,
    folder: getDirectionFolderName(index + 1),
    isInMoodboard: false,
  }));
}

export function createSeedDirections(): MoodboardDirectionFixture[] {
  return [
    { name: MOODBOARD_DIRECTION_NAMES[0] },
    { name: MOODBOARD_DIRECTION_NAMES[1], hasStyleGuide: true },
    { name: MOODBOARD_DIRECTION_NAMES[2] },
  ];
}

export function createDefaultSelectedReferenceIds(): Set<string> {
  return new Set(DEFAULT_SELECTED_REFERENCE_IDS);
}
