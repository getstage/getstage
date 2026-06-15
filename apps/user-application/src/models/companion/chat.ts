import { z } from "zod";
import { chatProjectReferenceSchema } from "@stage/data-ops/contracts";

export const stageChatAttachmentSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(240),
  mimeType: z.enum(["image/png", "image/jpeg", "image/webp"]),
  localPath: z.string().min(1),
  previewDataUrl: z.string().startsWith("data:image/").optional(),
});

export const stageChatMessageSchema = z.object({
  id: z.string().min(1),
  role: z.enum(["user", "stage"]),
  content: z.array(z.string().max(20_000)).max(200),
  createdAt: z.number().int().positive(),
  source: z.string().min(1).max(200).optional(),
  tone: z.enum(["error"]).optional(),
  attachments: z.array(stageChatAttachmentSchema).max(5).optional(),
});

export const stageChatSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(120),
  createdAt: z.number().int().positive(),
  updatedAt: z.number().int().positive(),
  project: chatProjectReferenceSchema.optional(),
  messages: z.array(stageChatMessageSchema).max(200),
});

export const stageChatStoreSchema = z.object({
  activeChatId: z.string().min(1).optional(),
  chats: z.array(stageChatSchema).max(50),
});

export const stageChatPanelSizeSchema = z.object({
  width: z.number().int().min(432).max(1100),
  height: z.number().int().min(504).max(900),
});

export type StageChatMessage = z.infer<typeof stageChatMessageSchema>;
export type StageChatAttachment = z.infer<typeof stageChatAttachmentSchema>;
export type StageChat = z.infer<typeof stageChatSchema>;
export type StageChatStore = z.infer<typeof stageChatStoreSchema>;
export type StageChatPanelSize = z.infer<typeof stageChatPanelSizeSchema>;
