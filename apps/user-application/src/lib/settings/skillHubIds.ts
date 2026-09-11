import { skillHubIdSchema } from "@shared/models/safeHttpsUrl";
import {
  COMPONENT_PACK_CATALOG,
  DISCOVER_SKILL_CATALOG,
  defaultProjectSelection,
} from "./skillsCatalog";

export function parseCatalogSkillId(id: string, extraIds: readonly string[] = []): string {
  const parsed = skillHubIdSchema.parse(id);
  if (
    !DISCOVER_SKILL_CATALOG.some((skill) => skill.id === parsed) &&
    !extraIds.includes(parsed)
  ) {
    throw new Error("Unknown skill.");
  }
  return parsed;
}

export function parseCatalogPackId(id: string, extraIds: readonly string[] = []): string {
  const parsed = skillHubIdSchema.parse(id);
  if (
    !COMPONENT_PACK_CATALOG.some((pack) => pack.id === parsed) &&
    !extraIds.includes(parsed)
  ) {
    throw new Error("Unknown component library.");
  }
  return parsed;
}

export function sanitizeCatalogIds(
  ids: readonly string[],
  allowedIds: readonly string[],
): string[] {
  const allowed = new Set(allowedIds);
  const next: string[] = [];
  for (const id of ids) {
    const parsed = skillHubIdSchema.safeParse(id);
    if (!parsed.success || !allowed.has(parsed.data) || next.includes(parsed.data)) {
      continue;
    }
    next.push(parsed.data);
  }
  return next;
}

export const CATALOG_SKILL_IDS = DISCOVER_SKILL_CATALOG.map((skill) => skill.id);
export const CATALOG_PACK_IDS = COMPONENT_PACK_CATALOG.map((pack) => pack.id);

export function sanitizeProjectCatalogSelection(
  skillIds: readonly string[],
  componentPackIds: readonly string[],
  extra?: { skillIds?: readonly string[]; packIds?: readonly string[] },
): { skillIds: string[]; componentPackIds: string[] } {
  return {
    skillIds: sanitizeCatalogIds(skillIds, [...(extra?.skillIds ?? []), ...CATALOG_SKILL_IDS]),
    componentPackIds: sanitizeCatalogIds(componentPackIds, [
      ...(extra?.packIds ?? []),
      ...CATALOG_PACK_IDS,
    ]),
  };
}

/**
 * Initial picker state: project's stored ids that the user still has added,
 * otherwise Stage defaults that are still installed.
 */
export function initialPickerSelection(input: {
  skillIds: readonly string[];
  componentPackIds: readonly string[];
  installedSkillIds: readonly string[];
  enabledComponentPackIds: readonly string[];
}): { skillIds: string[]; componentPackIds: string[] } {
  const skills = sanitizeCatalogIds(input.skillIds, input.installedSkillIds);
  const packs = sanitizeCatalogIds(input.componentPackIds, input.enabledComponentPackIds);
  if (skills.length > 0 || packs.length > 0) {
    return { skillIds: skills, componentPackIds: packs };
  }
  const defaults = defaultProjectSelection();
  return {
    skillIds: sanitizeCatalogIds(defaults.skillIds, input.installedSkillIds),
    componentPackIds: sanitizeCatalogIds(defaults.componentPackIds, input.enabledComponentPackIds),
  };
}
