import { useCallback, useMemo, useState } from "react";
import { useMutation as useConvexMutation, useQuery as useConvexQuery } from "convex/react";
import type { Id } from "@stage/data-ops/convex/data-model";
import { api } from "@/lib/convexApi";
import { WIREFRAME_BRAND_KIT_ACCEPT, uploadFileToR2, validateUploadFile } from "@/lib/r2Uploads";
import { toUserFacingErrorMessage } from "@/lib/errors";

// A brand kit file moves through these states; the R2 key only exists once uploaded.
export type BrandKitFile = {
  id: string;
  name: string;
  sizeBytes: number;
} & (
  | { status: "uploading" }
  | { status: "uploaded"; key: string }
  | { status: "failed"; error: string }
);

function makeId(file: File) {
  return `brand-kit-${file.name}-${file.size}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

// Uploads brand kit files (PDFs, fonts, images) to R2 so a Hi-Fi wireframes run can derive
// its visual language from the real brand kit. The upload is tracked durably in Convex, so a
// closed/reopened tab restores the file instead of losing it to local state. Keys are handed
// to the engine, which fetches the files and attaches them to the model run.
export function useWireframeBrandKit(projectId: string) {
  const r2GenerateUploadUrl = useConvexMutation(api.r2.generateUploadUrl);
  const r2SyncMetadata = useConvexMutation(api.r2.syncMetadata);
  const r2DeleteBrandKit = useConvexMutation(api.r2.deleteWireframeBrandKit);
  const persisted = useConvexQuery(
    api.r2.listWireframeBrandKit,
    projectId ? { projectId: projectId as Id<"projects"> } : "skip",
  );

  // Local rows track in-flight uploads (uploading/failed) and, on success, mirror the
  // persisted key so the reactive query and local state dedupe to a single row.
  const [localFiles, setLocalFiles] = useState<BrandKitFile[]>([]);
  // Keys removed in this session, hidden until the reactive query catches up.
  const [removedKeys, setRemovedKeys] = useState<Set<string>>(new Set());

  const files = useMemo<BrandKitFile[]>(() => {
    // The tracked row appears at upload-URL time (before bytes finish), so a persisted row
    // is hidden while a local row already represents it — by key once uploaded, or by
    // name+size while still uploading — to avoid a brief duplicate of the same file.
    const isShadowedByLocal = (row: { key: string; name: string; sizeBytes: number }) =>
      localFiles.some(
        (file) =>
          (file.status === "uploaded" && file.key === row.key) ||
          (file.status === "uploading" &&
            file.name === row.name &&
            file.sizeBytes === row.sizeBytes),
      );

    const persistedFiles: BrandKitFile[] = (persisted ?? [])
      .filter((row) => !removedKeys.has(row.key) && !isShadowedByLocal(row))
      .map((row) => ({
        id: row.key,
        name: row.name,
        sizeBytes: row.sizeBytes,
        status: "uploaded",
        key: row.key,
      }));
    return [...localFiles, ...persistedFiles];
  }, [persisted, localFiles, removedKeys]);

  const uploadFiles = useCallback(
    async (incoming: FileList | File[]) => {
      const fileArray = Array.from(incoming);
      if (fileArray.length === 0) return;

      const drafts = fileArray.map((file) => {
        const validationError = validateUploadFile("wireframe-brand-kit", file);
        const base = { id: makeId(file), name: file.name, sizeBytes: file.size };
        return validationError
          ? { draft: { ...base, status: "failed" as const, error: validationError }, file }
          : { draft: { ...base, status: "uploading" as const }, file };
      });

      setLocalFiles((current) => [...current, ...drafts.map((entry) => entry.draft)]);

      await Promise.all(
        drafts.map(async ({ draft, file }) => {
          if (draft.status === "failed") return;
          try {
            const key = await uploadFileToR2({
              generateUploadUrl: r2GenerateUploadUrl,
              syncMetadata: r2SyncMetadata,
              purpose: "wireframe-brand-kit",
              file,
              scopeId: projectId,
            });
            // Adopt the key as the id so this row merges with the persisted query row.
            setLocalFiles((current) =>
              current.map((entry) =>
                entry.id === draft.id
                  ? { id: key, name: entry.name, sizeBytes: entry.sizeBytes, status: "uploaded", key }
                  : entry,
              ),
            );
          } catch (error) {
            setLocalFiles((current) =>
              current.map((entry) =>
                entry.id === draft.id
                  ? {
                      id: entry.id,
                      name: entry.name,
                      sizeBytes: entry.sizeBytes,
                      status: "failed",
                      error: toUserFacingErrorMessage(error, "Upload failed. Please try again."),
                    }
                  : entry,
              ),
            );
          }
        }),
      );
    },
    [projectId, r2GenerateUploadUrl, r2SyncMetadata],
  );

  const removeFile = useCallback(
    async (id: string) => {
      const target = files.find((entry) => entry.id === id);
      setLocalFiles((current) => current.filter((entry) => entry.id !== id));
      if (target?.status === "uploaded" && projectId) {
        setRemovedKeys((current) => new Set(current).add(target.key));
        try {
          await r2DeleteBrandKit({ projectId: projectId as Id<"projects">, key: target.key });
        } catch {
          // Best-effort: if the delete fails, the hourly prune cron collects it within 24h.
        }
      }
    },
    [files, projectId, r2DeleteBrandKit],
  );

  const uploadedKeys = files
    .filter((file): file is Extract<BrandKitFile, { status: "uploaded" }> => file.status === "uploaded")
    .map((file) => file.key);
  const isUploading = files.some((file) => file.status === "uploading");

  return {
    accept: WIREFRAME_BRAND_KIT_ACCEPT,
    files,
    uploadFiles,
    removeFile,
    uploadedKeys,
    isUploading,
    hasUploadedFile: uploadedKeys.length > 0,
  };
}
