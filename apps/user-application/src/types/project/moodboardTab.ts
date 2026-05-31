import type { MoodboardDirection, MoodboardReference, MoodboardStyleGuide } from "@stage/data-ops/contracts";

export type MoodboardMode = "upload" | "figma";

export type MoodboardItem = {
  id: string;
  image: string;
  folder: string | null;
  directionId: string | null;
  isInMoodboard: boolean;
};

export type MoodboardDirectionView = MoodboardDirection;

export type MoodboardUploadedFileView = {
  id: string;
  name: string;
  sizeBytes: number;
};

export type MoodboardStyleGuideViewData = MoodboardStyleGuide;

export type MoodboardTabData = {
  importMode: MoodboardMode | null;
  directions: MoodboardDirectionView[];
  references: MoodboardItem[];
  uploadedFiles: MoodboardUploadedFileView[];
  styleGuides: MoodboardStyleGuideViewData[];
};

export function getDirectionName(
  directions: MoodboardDirectionView[],
  directionId: string | null | undefined,
): string | null {
  if (!directionId) {
    return null;
  }

  return directions.find((direction) => direction.id === directionId)?.name ?? null;
}

export function mapReferenceToItem(
  reference: MoodboardReference,
  directions: MoodboardDirectionView[],
): MoodboardItem {
  return {
    id: reference.id,
    image: reference.imageUrl,
    folder: getDirectionName(directions, reference.directionId),
    directionId: reference.directionId,
    isInMoodboard: reference.isInMoodboard,
  };
}
