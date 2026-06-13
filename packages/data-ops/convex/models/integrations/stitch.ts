import { v } from "convex/values";
import type { Id } from "../../_generated/dataModel";

export const stitchDeviceTypeValidator = v.union(
  v.literal("DEVICE_TYPE_UNSPECIFIED"),
  v.literal("MOBILE"),
  v.literal("DESKTOP"),
  v.literal("TABLET"),
  v.literal("AGNOSTIC"),
);

export const stitchModelIdValidator = v.union(
  v.literal("MODEL_ID_UNSPECIFIED"),
  v.literal("GEMINI_3_PRO"),
  v.literal("GEMINI_3_FLASH"),
);

export type StitchDeviceType =
  | "DEVICE_TYPE_UNSPECIFIED"
  | "MOBILE"
  | "DESKTOP"
  | "TABLET"
  | "AGNOSTIC";

export type StitchModelId =
  | "MODEL_ID_UNSPECIFIED"
  | "GEMINI_3_PRO"
  | "GEMINI_3_FLASH";

export type DesignConnectionStatus = "active" | "error" | "archived";
export type GeneratedDesignSource = "stage_proxy" | "user_sync";
export type GeneratedDesignStatus = "ready" | "error";

export type ViewerContext = {
  userId: Id<"users">;
};

export const syncProjectDesignScreenValidator = v.object({
  stitchScreenId: v.string(),
  stitchScreenUrl: v.optional(v.string()),
  r2ObjectKey: v.string(),
  title: v.optional(v.string()),
  prompt: v.optional(v.string()),
  phaseId: v.optional(v.string()),
  deviceType: v.optional(stitchDeviceTypeValidator),
  modelId: v.optional(stitchModelIdValidator),
  sortOrder: v.optional(v.number()),
});
