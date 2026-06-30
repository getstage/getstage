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

// A whole-display source surfaces in the picker as "Entire screen" (or "Screen N" on
// multi-monitor setups) so users can grab everything they see, not just one window.
function screenSourceName(rawName: string, index: number, total: number): string {
  if (total <= 1) {
    return "Entire screen";
  }
  const trimmed = rawName.trim();
  return trimmed.length > 0 && trimmed.toLowerCase() !== "entire screen" ? trimmed : `Screen ${index + 1}`;
}

// On macOS `desktopCapturer.getSources` throws ("Failed to get sources") when Screen
// Recording permission is missing. Swallow that per-type so one blocked kind never kills
// the whole picker — the caller surfaces the friendly permission banner instead of a raw error.
async function safeGetSources(
  options: Parameters<typeof desktopCapturer.getSources>[0],
): Promise<Electron.DesktopCapturerSource[]> {
  try {
    return await desktopCapturer.getSources(options);
  } catch (error) {
    // macOS throws "Failed to get sources" when Screen Recording permission is
    // missing — swallow that per-type so one blocked kind never kills the whole
    // picker (the caller surfaces the friendly permission banner instead).
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("Failed to get sources")) {
      return [];
    }
    // Anything else (API shape changes, Chromium-internal crashes, OOM) is a real
    // bug — log it so we can distinguish structural failures from permission gaps
    // without a debugger, then still return [] to keep the picker responsive.
    console.error(
      "[chat-attachments] desktopCapturer.getSources failed unexpectedly",
      error,
    );
    return [];
  }
}

export async function listWindowCaptureSources(): Promise<CaptureWindowSource[]> {
  const [screens, windows] = await Promise.all([
    safeGetSources({ types: ["screen"], thumbnailSize: THUMBNAIL_SIZE }),
    safeGetSources({ types: ["window"], fetchWindowIcons: true, thumbnailSize: THUMBNAIL_SIZE }),
  ]);

  const screenSources = screens
    .filter((source) => !source.thumbnail.isEmpty())
    .map((source, index, all) => captureWindowSourceSchema.parse({
      id: source.id,
      name: screenSourceName(source.name, index, all.length),
      kind: "screen",
      previewDataUrl: source.thumbnail.toDataURL(),
    }));

  const windowSources = windows
    .filter((source) => !source.thumbnail.isEmpty() && !source.name.startsWith("Stage"))
    .slice(0, 20)
    .map((source) => captureWindowSourceSchema.parse({
      id: source.id,
      name: source.name,
      kind: "window",
      previewDataUrl: source.thumbnail.toDataURL(),
    }));

  // Screens first: "grab the whole screen" is the most common reach for review.
  return [...screenSources, ...windowSources];
}

export async function captureWindowSource(input: CaptureWindowRequest): Promise<ChatImageAttachment> {
  const request = captureWindowRequestSchema.parse(input);
  // Query both kinds so a screen id (`screen:…`) resolves the same way a window id does.
  const sources = await desktopCapturer.getSources({
    types: ["screen", "window"],
    thumbnailSize: THUMBNAIL_SIZE,
  });
  const source = sources.find((candidate) => candidate.id === request.sourceId);
  if (!source || source.thumbnail.isEmpty()) {
    throw new Error("That screen or window is no longer available.");
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
