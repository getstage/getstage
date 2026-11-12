import type { GeneratedStyleGuide, MoodboardArtifact, MoodboardReference, MoodboardStyleGuide } from "../contracts/moodboard";
import type { ProjectCategory } from "../contracts/desktop-api/project";
import type { ResearchArtifact } from "../contracts/research";

// Moodboard and Style guide rules shared by Stage for Mac and the backend (MCP saves).
// The engine has the same rules in Rust (`apps/stage-engine/src/moodboard/workflow.rs`,
// `apps/stage-engine/src/styleguide/{mod,normalize}.rs`); keep both in step.

/** "Calm Editorial" → "direction-calm-editorial" (the Mac app keys directions by name). */
export function directionIdFromName(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `direction-${slug || "untitled"}`;
}

export function emptyMoodboardArtifact(projectId: string, title: string, generatedAt: number): MoodboardArtifact {
  return {
    apiVersion: "v1",
    artifactKind: "moodboardArtifact",
    projectId,
    title,
    directions: [],
    references: [],
    uploadedFiles: [],
    styleGuides: [],
    generatedAt,
  };
}

/**
 * Adds imported references after the existing ones. With a direction name, the references go into that
 * direction (created when missing) and onto the board; without one they are staged like a Mac import.
 */
export function appendMoodboardReferences(
  artifact: MoodboardArtifact,
  references: Omit<MoodboardReference, "order" | "directionId" | "isInMoodboard">[],
  options: { importMode: NonNullable<MoodboardArtifact["importMode"]>; directionName?: string; generatedAt: number },
): MoodboardArtifact {
  const directionId = options.directionName ? directionIdFromName(options.directionName) : null;
  const directions = directionId && options.directionName && !artifact.directions.some((direction) => direction.id === directionId)
    ? [...artifact.directions, { id: directionId, name: options.directionName.trim(), hasStyleGuide: false }]
    : artifact.directions;
  return {
    ...artifact,
    directions,
    references: [
      ...artifact.references,
      ...references.map((reference, index) => ({
        ...reference,
        directionId,
        isInMoodboard: directionId !== null,
        order: artifact.references.length + index,
      })),
    ],
    importMode: options.importMode,
    generatedAt: options.generatedAt,
  };
}

const CATEGORY_CONVENTIONS: Record<ProjectCategory, string[]> = {
  websites: [
    "Use responsive marketing-page hierarchy with a clear narrative and conversion path.",
    "Specify semantic page sections, reusable content modules, and mobile-through-desktop behavior.",
    "Treat performance, accessibility, SEO structure, and content scanning as first-class constraints.",
  ],
  "web-apps": [
    "Use stateful product patterns with explicit navigation, system feedback, forms, tables, and empty states.",
    "Specify responsive application shells and information density for sustained use.",
    "Cover keyboard access, loading, error, success, and permission states.",
  ],
  "ios-apps": [
    "Follow native iOS navigation, safe-area, sheet, tab, and gesture conventions.",
    "Use Dynamic Type-compatible hierarchy and touch targets of at least 44 points.",
    "Specify light and dark appearance behavior plus loading, error, empty, and permission states.",
  ],
};

const IMPLEMENTATION_NOTES = [
  "Use the supplied colors as named design tokens; do not replace them with framework defaults.",
  "Load the specified typeface and implement every listed size, weight, and line height as a reusable text style.",
  "Treat the selected moodboard direction as the visual source of truth; do not substitute a generic palette, typeface, or grid.",
  "Apply the category conventions to structure and interaction without overriding the moodboard's visual character.",
];

// Ubiquitous system / AI-default fonts the style guide never uses (matched on the first family of a stack).
const BANNED_FONT_FAMILIES = new Set([
  "inter", "helvetica", "helvetica neue", "arial", "roboto", "open sans", "lato", "system-ui", "ui-sans-serif",
  "sans-serif", "system", "-apple-system", "segoe ui", "times", "times new roman", "georgia", "garamond", "palatino",
]);
const DEFAULT_FONT_FAMILY = "Geist";

/** The font a style guide may use: banned system / AI-default families become Geist. */
export function repairFontFamily(family: string) {
  const primary = (family.split(",")[0] ?? "").trim().replace(/^["']|["']$/g, "").trim().toLowerCase();
  return primary === "" || BANNED_FONT_FAMILIES.has(primary) ? DEFAULT_FONT_FAMILY : family;
}

/** Research ids a style guide may cite: source references, then UI pattern examples (max 32, no repeats). */
export function researchReferenceIds(research: Pick<ResearchArtifact, "sourceReferences" | "uiPatterns">) {
  const ids = [
    ...research.sourceReferences.map((reference) => reference.id),
    ...research.uiPatterns.flatMap((group) => group.examples.map((example) => example.sourceReferenceId ?? "")),
  ].filter((id) => id.trim());
  return [...new Set(ids)].slice(0, 32);
}

/**
 * Turns a generated style guide into the saved one, as the engine does: keeps the direction's guide id,
 * repairs banned fonts, and grounds it in the project category and the Research references.
 */
export function normalizeStyleGuide(
  generated: GeneratedStyleGuide,
  context: { id: string; directionId: string; directionName: string; category: ProjectCategory; researchReferenceIds: string[] },
): MoodboardStyleGuide {
  return {
    ...generated,
    id: context.id,
    directionId: context.directionId,
    title: generated.title ?? `${context.directionName} Style Guide`,
    subtitle: generated.subtitle ?? "Brand Handbook for your project",
    componentSwatchCount: generated.componentSwatchCount,
    typography: {
      ...generated.typography,
      fontFamily: repairFontFamily(generated.typography.fontFamily),
    },
    projectCategory: context.category,
    categoryConventions: CATEGORY_CONVENTIONS[context.category],
    researchReferenceIds: context.researchReferenceIds,
    implementationNotes: IMPLEMENTATION_NOTES,
  };
}

/** Replaces the direction's style guide and marks the direction as having one. */
export function mergeStyleGuide(artifact: MoodboardArtifact, styleGuide: MoodboardStyleGuide): MoodboardArtifact {
  return {
    ...artifact,
    styleGuides: [...artifact.styleGuides.filter((guide) => guide.directionId !== styleGuide.directionId), styleGuide],
    directions: artifact.directions.map((direction) =>
      direction.id === styleGuide.directionId ? { ...direction, hasStyleGuide: true, styleGuideId: styleGuide.id } : direction),
  };
}

export function directionHasImages(artifact: MoodboardArtifact, directionId: string) {
  return artifact.references.some((reference) =>
    reference.directionId === directionId && reference.isInMoodboard &&
    [reference.imageUrl, reference.thumbnailUrl, reference.imageAssetKey, reference.thumbnailAssetKey].some((value) => value?.trim()));
}
