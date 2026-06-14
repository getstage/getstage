import { randomUUID } from "node:crypto";
import { mkdir, readFile, realpath, rm, stat, writeFile } from "node:fs/promises";
import { extname, join, resolve, sep } from "node:path";
import { app, desktopCapturer, dialog, nativeImage } from "electron";
import {
  captureWindowRequestSchema,
  chatAttachmentTargetSchema,
  chatImageAttachmentSchema,
  importChatImageBytesRequestSchema,
  captureWindowSourceSchema,
  type CaptureWindowRequest,
  type ChatAttachmentTarget,
  type ChatImageAttachment,
  type ImportChatImageBytesRequest,
  type CaptureWindowSource,
} from "@shared/models/desktop";

const MAX_ATTACHMENTS = 5;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const THUMBNAIL_SIZE = { width: 1280, height: 800 };
const MIME_BY_EXTENSION = new Map<string, ChatImageAttachment["mimeType"]>([
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".webp", "image/webp"],
]);

function attachmentRoot() {
  return join(app.getPath("userData"), "stage-chat-attachments");
}

function chatDirectory(input: ChatAttachmentTarget) {
  return join(attachmentRoot(), chatAttachmentTargetSchema.parse(input).chatId);
}

async function persistImage(args: {
  chatId: string;
  bytes: Buffer;
  mimeType: ChatImageAttachment["mimeType"];
  name: string;
}): Promise<ChatImageAttachment> {
  if (args.bytes.byteLength > MAX_IMAGE_BYTES) {
    throw new Error("Images must be 10 MB or smaller.");
  }
  const image = nativeImage.createFromBuffer(args.bytes);
  if (image.isEmpty()) {
    throw new Error("The selected file is not a valid image.");
  }

  const id = randomUUID();
  const extension = args.mimeType === "image/jpeg" ? ".jpg" : `.${args.mimeType.split("/")[1]}`;
  const directory = chatDirectory({ chatId: args.chatId });
  await mkdir(directory, { recursive: true });
  const localPath = join(directory, `${id}${extension}`);
  await writeFile(localPath, args.bytes, { flag: "wx" });

  return chatImageAttachmentSchema.parse({
    id,
    name: args.name,
    mimeType: args.mimeType,
    localPath,
    previewDataUrl: image.resize({ width: 240, quality: "good" }).toDataURL(),
  });
}

export async function listWindowCaptureSources(): Promise<CaptureWindowSource[]> {
  const sources = await desktopCapturer.getSources({
    types: ["window"],
    fetchWindowIcons: true,
    thumbnailSize: THUMBNAIL_SIZE,
  });

  return sources
    .filter((source) => !source.thumbnail.isEmpty() && !source.name.startsWith("Stage"))
    .slice(0, 20)
    .map((source) => captureWindowSourceSchema.parse({
      id: source.id,
      name: source.name,
      previewDataUrl: source.thumbnail.toDataURL(),
    }));
}

export async function captureWindowSource(input: CaptureWindowRequest): Promise<ChatImageAttachment> {
  const request = captureWindowRequestSchema.parse(input);
  const sources = await desktopCapturer.getSources({
    types: ["window"],
    thumbnailSize: THUMBNAIL_SIZE,
  });
  const source = sources.find((candidate) => candidate.id === request.sourceId);
  if (!source || source.thumbnail.isEmpty()) {
    throw new Error("The selected window is no longer available.");
  }

  return persistImage({
    chatId: request.chatId,
    bytes: source.thumbnail.toPNG(),
    mimeType: "image/png",
    name: `${source.name}.png`,
  });
}

export async function importChatImages(input: ChatAttachmentTarget): Promise<ChatImageAttachment[]> {
  const target = chatAttachmentTargetSchema.parse(input);
  const result = await dialog.showOpenDialog({
    properties: ["openFile", "multiSelections"],
    filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp"] }],
  });
  if (result.canceled) {
    return [];
  }

  const attachments: ChatImageAttachment[] = [];
  for (const filePath of result.filePaths.slice(0, MAX_ATTACHMENTS)) {
    const mimeType = MIME_BY_EXTENSION.get(extname(filePath).toLowerCase());
    if (!mimeType) {
      continue;
    }
    const bytes = await readFile(filePath);
    attachments.push(await persistImage({
      chatId: target.chatId,
      bytes,
      mimeType,
      name: filePath.split(/[\\/]/).at(-1) ?? "image",
    }));
  }
  return attachments;
}

export async function importChatImageBytes(input: ImportChatImageBytesRequest) {
  const request = importChatImageBytesRequestSchema.parse(input);
  return persistImage({
    chatId: request.chatId,
    bytes: Buffer.from(request.bytes),
    mimeType: request.mimeType,
    name: request.name,
  });
}

export async function deleteChatAttachments(input: ChatAttachmentTarget) {
  await rm(chatDirectory(input), { recursive: true, force: true });
  return { ok: true as const };
}

export async function assertLocalChatAttachmentPaths(
  attachments: Array<{ localPath?: string }>,
) {
  await mkdir(attachmentRoot(), { recursive: true });
  const root = await realpath(attachmentRoot());
  for (const attachment of attachments) {
    if (!attachment.localPath) {
      continue;
    }
    const localPath = await realpath(resolve(attachment.localPath));
    if (!localPath.startsWith(`${root}${sep}`)) {
      throw new Error("Chat attachment path is outside Stage local storage.");
    }
    const file = await stat(localPath);
    if (!file.isFile() || file.size > MAX_IMAGE_BYTES) {
      throw new Error("Chat attachment is invalid.");
    }
  }
}
