import type {
  MoodboardDirection,
  MoodboardReference,
  MoodboardReferenceSource,
  MoodboardStyleGuide,
} from "@stage/data-ops/contracts";

export type MoodboardMode = "upload" | "figma" | "ai" | "url";

export type MoodboardItem = {
  id: string;
  title?: string;
  image: string;
  imageUrl?: string;
  imageAssetKey?: string;
  thumbnailUrl?: string;
  thumbnailAssetKey?: string;
  source?: MoodboardReferenceSource;
  sourceUrl?: string;
  uploadedAssetId?: string;
  folder: string | null;
  directionId: string | null;
  isInMoodboard: boolean;
};

export type MoodboardDirectionView = MoodboardDirection;

export type MoodboardUploadedFileView = {
  id: string;
  name: string;
  sizeBytes: number;
  uploadedAssetId?: string;
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
  const displayImage = reference.thumbnailUrl ?? reference.imageUrl;

  return {
    id: reference.id,
    title: reference.title,
    image: displayImage,
    imageUrl: reference.imageUrl,
    imageAssetKey: reference.imageAssetKey,
    thumbnailUrl: reference.thumbnailUrl,
    thumbnailAssetKey: reference.thumbnailAssetKey,
    source: reference.source,
    sourceUrl: reference.sourceUrl,
    uploadedAssetId: reference.uploadedAssetId,
    folder: getDirectionName(directions, reference.directionId),
    directionId: reference.directionId,
    isInMoodboard: reference.isInMoodboard,
  };
}
