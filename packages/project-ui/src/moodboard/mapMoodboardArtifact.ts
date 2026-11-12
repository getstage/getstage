import type { MoodboardArtifact } from "@stage/data-ops/contracts";
import { directionIdFromName } from "@stage/data-ops/domain";
import type { MoodboardTabData } from "./types";
import { mapReferenceToItem } from "./types";

export function mapMoodboardArtifactToTabData(artifact: MoodboardArtifact): MoodboardTabData {
  const directions = artifact.directions;

  return {
    importMode: artifact.importMode ?? null,
    directions,
    references: artifact.references.map((reference) => mapReferenceToItem(reference, directions)),
    uploadedFiles: artifact.uploadedFiles.map((file) => ({
      id: file.id,
      name: file.name,
      sizeBytes: file.sizeBytes,
      uploadedAssetId: file.uploadedAssetId,
    })),
    styleGuides: artifact.styleGuides,
  };
}

export function getStyleGuideForDirection(
  tabData: MoodboardTabData,
  directionId: string,
): MoodboardTabData["styleGuides"][number] | null {
  return tabData.styleGuides.find((styleGuide) => styleGuide.directionId === directionId) ?? null;
}

// Old projects got empty "Direction 1–3" folders automatically; they stay hidden unless used.
const LEGACY_AUTO_DIRECTION_NAMES = new Set(["Direction 1", "Direction 2", "Direction 3"]);

/** The directions the moodboard shows, each with whether it has a style guide. */
export function boardDirections(tabData: MoodboardTabData) {
  const usedDirectionNames = new Set(tabData.references.map((reference) => reference.folder).filter((folder) => folder !== null));
  const styleGuideDirectionIds = new Set(tabData.styleGuides.map((styleGuide) => styleGuide.directionId));
  return tabData.directions
    .map((direction) => ({ name: direction.name, hasStyleGuide: styleGuideDirectionIds.has(directionIdFromName(direction.name)) }))
    .filter((direction) => !LEGACY_AUTO_DIRECTION_NAMES.has(direction.name) || usedDirectionNames.has(direction.name) || direction.hasStyleGuide);
}
