import { v } from "convex/values";

export const projectTypeValidator = v.union(
  v.literal("branding"),
  v.literal("web-design"),
  v.literal("product-design"),
  v.literal("app-design"),
  v.literal("web-app"),
  v.literal("packaging"),
  v.literal("motion-design"),
  v.literal("illustration"),
  v.literal("other"),
);

export const phaseInputValidator = v.object({
  id: v.optional(v.id("phases")),
  name: v.string(),
});

export const phaseCreationInputValidator = v.object({
  name: v.string(),
  tasks: v.optional(v.array(v.string())),
});

export const createProjectArgsValidator = {
  name: v.string(),
  clientName: v.string(),
  clientEmail: v.optional(v.string()),
  clientAvatarUrl: v.optional(v.string()),
  projectImageUrl: v.optional(v.string()),
  startMarkerImageUrl: v.optional(v.string()),
  endMarkerImageUrl: v.optional(v.string()),
  type: projectTypeValidator,
  typeOtherLabel: v.optional(v.string()),
  method: v.union(v.literal("ai"), v.literal("manual")),
  startDate: v.number(),
  endDate: v.number(),
  phases: v.optional(v.array(phaseCreationInputValidator)),
} as const;

export function normalizeCatalogIds(ids: string[]): string[] {
  return Array.from(new Set(ids.map((id) => id.trim()).filter((id) => id.length > 0))).slice(0, 32);
}

/** Convex `v.object` for `Infer<>` / desktop handlers. */
export const createProjectArgsObject = v.object(createProjectArgsValidator);

export const projectStatusValidator = v.union(
  v.literal("active"),
  v.literal("paused"),
  v.literal("completed"),
);
