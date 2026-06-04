import type {
  MoodboardArtifact,
  MoodboardDirection,
  MoodboardReference,
  MoodboardReferenceSource,
  MoodboardStyleGuide,
  MoodboardUploadedFile,
} from "@stage/data-ops/contracts";
import type { MoodboardMode } from "@/types/project/moodboardTab";
import { buildMoodboardArtifact } from "./buildMoodboardArtifact";

/** A board reference as held in tab-local state (folder is the direction name). */
export type MoodboardBoardItem = {
  id: string;
  title?: string;
  image: string;
  imageUrl?: string;
  imageAssetKey?: string;
  thumbnailUrl?: string;
  thumbnailAssetKey?: string;
  folder: string | null;
  isInMoodboard: boolean;
  source?: MoodboardReferenceSource;
  sourceUrl?: string;
  uploadedAssetId?: string;
};

export type MoodboardBoardDirection = {
  name: string;
  hasStyleGuide?: boolean;
};

export type MoodboardBoardState = {
  mode: MoodboardMode;
  items: MoodboardBoardItem[];
  directions: MoodboardBoardDirection[];
  uploadedFiles: MoodboardUploadedFile[];
};

/**
 * Deterministic direction id from its display name. Directions are deduped by
 * name in the UI, so a name-derived id stays stable across save/reload without
 * threading ids through every tab component.
 */
export function directionIdFromName(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `direction-${slug || "untitled"}`;
}

/** Map tab-local board state to a validated `moodboardArtifact`. */
export function tabStateToMoodboardArtifact(
  project: { id: string; name: string },
  state: MoodboardBoardState,
  styleGuides: MoodboardStyleGuide[],
): MoodboardArtifact {
  const directions: MoodboardDirection[] = state.directions.map((direction) => ({
    id: directionIdFromName(direction.name),
    name: direction.name,
    hasStyleGuide: Boolean(direction.hasStyleGuide),
  }));

  const references: MoodboardReference[] = state.items.map((item, index) => ({
    id: item.id,
    title: item.title,
    imageUrl: item.imageAssetKey ?? item.imageUrl ?? item.image,
    imageAssetKey: item.imageAssetKey,
    thumbnailUrl: item.thumbnailAssetKey ?? item.thumbnailUrl,
    thumbnailAssetKey: item.thumbnailAssetKey,
    source: item.source ?? "upload",
    sourceUrl: item.sourceUrl,
    uploadedAssetId: item.uploadedAssetId,
    directionId: item.folder ? directionIdFromName(item.folder) : null,
    isInMoodboard: item.isInMoodboard,
    order: index,
  }));

  return buildMoodboardArtifact({
    projectId: project.id,
    projectName: project.name,
    importMode: state.mode,
    directions,
    references,
    uploadedFiles: state.uploadedFiles,
    styleGuides,
  });
}
