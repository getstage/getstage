import { v } from "convex/values";

export const aiModule = v.union(
  v.literal("research"),
  v.literal("strategy"),
  v.literal("flows"),
  v.literal("moodboard"),
  v.literal("generate"),
  v.literal("delivery"),
);

export const aiRunStatus = v.union(
  v.literal("draft"),
  v.literal("running"),
  v.literal("completed"),
  v.literal("failed"),
  v.literal("needs_input"),
);

export const aiArtifactStatus = v.union(
  v.literal("draft"),
  v.literal("ready"),
  v.literal("approved"),
  v.literal("superseded"),
  v.literal("failed"),
);

export const aiContentFormat = v.union(
  v.literal("markdown"),
  v.literal("json"),
  v.literal("link_set"),
);

export const exportProvider = v.union(v.literal("notion"), v.literal("figma"));

export const exportStatus = v.union(
  v.literal("requested"),
  v.literal("in_progress"),
  v.literal("completed"),
  v.literal("failed"),
);

export const projectAiProviderId = v.union(v.literal("claude"), v.literal("codex"));

export type AiModule =
  | "research"
  | "strategy"
  | "flows"
  | "moodboard"
  | "generate"
  | "delivery";
