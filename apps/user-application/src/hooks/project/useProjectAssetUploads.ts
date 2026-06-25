import { useMutation as useConvexMutation } from "convex/react";
import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { api } from "@/lib/convexApi";
import {
  getNormalizedMimeType,
  PROJECT_ASSET_ACCEPT,
  uploadFileToR2,
  validateUploadFile,
} from "@/lib/r2Uploads";
import { formatUploadDate, getProjectAssetSizeError } from "@/lib/project/assetsTab";
import type { UploadedAssetRow } from "@/types/project/assetsTab";

export function useProjectAssetUploads(onUploaded?: () => void, projectId?: string) {
  const r2GenerateUploadUrl = useConvexMutation(api.r2.generateUploadUrl);
  const r2SyncMetadata = useConvexMutation(api.r2.syncMetadata);

  const [uploadedAssets, setUploadedAssets] = useState<UploadedAssetRow[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const openUrlsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    return () => {
      for (const openUrl of openUrlsRef.current) {
        URL.revokeObjectURL(openUrl);
      }
      openUrlsRef.current.clear();
    };
  }, []);

  async function uploadFiles(files: FileList | File[]) {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    const drafts = fileArray.map((file) => {
      const sizeError = getProjectAssetSizeError(file);
      const validationError = sizeError ?? validateUploadFile("project-asset", file);
      const openUrl = validationError ? undefined : URL.createObjectURL(file);
      if (openUrl) {
        openUrlsRef.current.add(openUrl);
      }

      return {
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        title: file.name,
        date: formatUploadDate(Date.now()),
        status: validationError ? ("failed" as const) : ("uploading" as const),
        error: validationError ?? undefined,
        mimeType: getNormalizedMimeType(file),
        openUrl,
        file: validationError ? undefined : file,
      };
    });

    setUploadedAssets((current) => [...drafts, ...current]);
    onUploaded?.();

    await Promise.all(
      drafts.map(async (draft, index) => {
        if (draft.status === "failed") return;
        const file = fileArray[index];
        if (!file) return;

        try {
          const key = await uploadFileToR2({
            generateUploadUrl: r2GenerateUploadUrl,
            syncMetadata: r2SyncMetadata,
            purpose: "project-asset",
            file,
            scopeId: projectId,
          });
          setUploadedAssets((current) =>
            current.map((asset) =>
              asset.id === draft.id ? { ...asset, status: "uploaded", r2ObjectKey: key } : asset,
            ),
          );
        } catch (error) {
          setUploadedAssets((current) =>
            current.map((asset) =>
              asset.id === draft.id
                ? {
                    ...asset,
                    status: "failed",
                    error: error instanceof Error ? error.message : "Upload failed.",
                  }
                : asset,
            ),
          );
        }
      }),
    );
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragActive(false);
    void uploadFiles(event.dataTransfer.files);
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files) void uploadFiles(event.target.files);
    event.currentTarget.value = "";
  }

  return {
    accept: PROJECT_ASSET_ACCEPT,
    uploadedAssets,
    isDragActive,
    setIsDragActive,
    handleDrop,
    handleInputChange,
    uploadFiles,
  };
}
