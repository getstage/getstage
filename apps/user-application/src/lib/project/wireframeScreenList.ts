import type { WireframeBrandSource, WireframeKind } from "@stage/data-ops/contracts";
import type { ProjectScreen } from "@/models/project/project";
import type { ScreenItem } from "@/types/project/wireframesTab";

/** Priority given to a screen the user added by hand: nothing ranks it yet. */
export const MANUAL_SCREEN_PRIORITY = "P2";

export type ScreenDraft = {
  title: string;
  description: string;
  kind: ScreenItem["kind"];
};

export const EMPTY_SCREEN_DRAFT: ScreenDraft = {
  title: "",
  description: "",
  kind: "Page",
};

/**
 * The engine reads a run as a comma-separated token string. `screens:` scopes the
 * run: only those ids are generated, and the result is merged into the existing
 * artifact, appending ids that were never generated before. Omitting the token
 * means "generate everything", which is exactly what we must never do implicitly.
 */
export function buildWireframeRunSource(
  kind: WireframeKind,
  brandSource: WireframeBrandSource | null,
  styleDirectionId?: string | null,
  screenIds?: string[],
  useNebius?: boolean,
): string {
  const tokens = [`kind:${kind}`];
  if (brandSource) {
    tokens.push(`brand:${brandSource}`);
  }
  if (styleDirectionId) {
    tokens.push(`style-direction:${styleDirectionId}`);
  }
  if (useNebius) {
    tokens.push("gen:nebius");
  }
  if (screenIds && screenIds.length > 0) {
    tokens.push(`screens:${screenIds.join(";")}`);
  }
  return tokens.join(",");
}

export function screenIdsFromRunSource(source: string | null | undefined) {
  if (!source) {
    return null;
  }

  for (const segment of source.split(",")) {
    const token = segment.trim();
    if (!token.startsWith("screens:")) {
      continue;
    }

    const ids = token
      .slice("screens:".length)
      .split(";")
      .map((id) => id.trim())
      .filter(Boolean);

    if (ids.length > 0) {
      return ids;
    }
  }

  return null;
}

/**
 * Screens a run must produce. An explicit list wins (regenerate, or generating a
 * single freshly added screen); otherwise it is exactly what the user ticked in
 * Configure. An empty result means the caller has to refuse the run.
 */
export function resolveRunScreenIds(screens: ScreenItem[], screenIds?: string[]): string[] {
  if (screenIds) {
    return screenIds;
  }

  return screens.filter((screen) => screen.selected).map((screen) => screen.id);
}

/**
 * Stable, collision-free id for a manually added screen. Ids end up in the run
 * source (`screens:a;b`) and key the persisted artifact, so they must be slugs
 * and must never shadow an existing screen.
 */
export function screenIdFromTitle(title: string, existingIds: Iterable<string>): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const base = slug || "screen";
  const taken = new Set(existingIds);

  if (!taken.has(base)) {
    return base;
  }

  let suffix = 2;
  while (taken.has(`${base}-${suffix}`)) {
    suffix += 1;
  }
  return `${base}-${suffix}`;
}

export function createScreenItem(draft: ScreenDraft, existingIds: Iterable<string>): ScreenItem {
  const title = draft.title.trim();

  return {
    id: screenIdFromTitle(title, existingIds),
    title,
    description: draft.description.trim(),
    kind: draft.kind,
    priority: MANUAL_SCREEN_PRIORITY,
    required: false,
    selected: true,
  };
}

/** Edits keep the id: it already addresses a generated screen in the artifact. */
export function applyScreenDraft(screens: ScreenItem[], id: string, draft: ScreenDraft) {
  return screens.map((screen) =>
    screen.id === id
      ? {
          ...screen,
          title: draft.title.trim(),
          description: draft.description.trim(),
          kind: draft.kind,
        }
      : screen,
  );
}

/**
 * Flows screens carry no priority of their own; the number of flows a screen
 * appears in is the only real ranking signal the artifact gives us.
 */
function priorityFromFlowCount(flowCount: number): string {
  if (flowCount >= 3) {
    return "P0";
  }
  if (flowCount === 2) {
    return "P1";
  }
  return "P2";
}

/**
 * The pre-run screen list before anything is generated. Flows is the only real,
 * project-specific source for it — there is no generic default worth inventing.
 */
export function mapFlowScreensToScreenItems(screens: ProjectScreen[]): ScreenItem[] {
  return screens.map((screen) => ({
    id: screen.id,
    title: screen.title,
    description:
      screen.description.trim() ||
      // The persisted artifact requires a description; say where the screen came from.
      `Screen identified in Flows${screen.flowCount > 0 ? ` · appears in ${screen.flowCount} flows` : ""}`,
    kind: "Page" as const,
    priority: priorityFromFlowCount(screen.flowCount),
    required: false,
    selected: true,
  }));
}
