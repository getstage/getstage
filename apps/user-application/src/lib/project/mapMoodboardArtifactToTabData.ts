import type { MoodboardArtifact } from "@stage/data-ops/contracts";
import type { MoodboardTabData } from "@/types/project/moodboardTab";
import { mapReferenceToItem } from "@/types/project/moodboardTab";

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
