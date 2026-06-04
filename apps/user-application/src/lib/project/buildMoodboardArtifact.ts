import {
  moodboardArtifactSchema,
  type MoodboardArtifact,
  type MoodboardDirection,
  type MoodboardImportMode,
  type MoodboardReference,
  type MoodboardStyleGuide,
  type MoodboardUploadedFile,
} from "@stage/data-ops/contracts";

export type BuildMoodboardArtifactArgs = {
  projectId: string;
  projectName: string;
  importMode?: MoodboardImportMode | null;
  strategyArtifactId?: string;
  directions: MoodboardDirection[];
  references: MoodboardReference[];
  uploadedFiles: MoodboardUploadedFile[];
  styleGuides: MoodboardStyleGuide[];
};

/**
 * Assemble + validate a `moodboardArtifact` from the current board state.
 * Throws if the assembled shape violates the contract — callers persist only
 * validated JSON, mirroring how Research/Strategy save typed artifacts.
 */
export function buildMoodboardArtifact(args: BuildMoodboardArtifactArgs): MoodboardArtifact {
  return moodboardArtifactSchema.parse({
    apiVersion: "v1",
    artifactKind: "moodboardArtifact",
    projectId: args.projectId,
    title: `${args.projectName} moodboard`.trim(),
    strategyArtifactId: args.strategyArtifactId,
    importMode: args.importMode ?? undefined,
    directions: args.directions,
    references: args.references,
    uploadedFiles: args.uploadedFiles,
    styleGuides: args.styleGuides,
    generatedAt: Date.now(),
  } satisfies Partial<MoodboardArtifact>);
}
