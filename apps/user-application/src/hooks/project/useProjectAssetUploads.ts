import { useMutation as useConvexMutation, useQuery as useConvexQuery } from "convex/react";
import type { Id } from "@stage/data-ops/convex/data-model";
import { useState, type ChangeEvent, type DragEvent } from "react";
import { api } from "@/lib/convexApi";
import {
  getNormalizedMimeType,
  PROJECT_ASSET_ACCEPT,
  uploadFileToR2,
  validateUploadFile,
} from "@/lib/r2Uploads";
import { formatUploadDate, getProjectAssetSizeError } from "@/lib/project/assetsTab";
import { toUserFacingErrorMessage } from "@/lib/errors";
import type { UploadedAssetRow } from "@/types/project/assetsTab";

export function useProjectAssetUploads(onUploaded?: () => void, projectId?: string) {
  const r2GenerateUploadUrl = useConvexMutation(api.r2.generateUploadUrl);
  const r2SyncMetadata = useConvexMutation(api.r2.syncMetadata);
  const r2DeleteProjectAsset = useConvexMutation(api.r2.deleteProjectAsset);
  const persistedAssets = useConvexQuery(
    api.r2.listProjectAssets,
    projectId ? { projectId: projectId as Id<"projects"> } : "skip",
  );

  const [uploadedAssets, setUploadedAssets] = useState<UploadedAssetRow[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const persistedRows = (persistedAssets ?? []).map((asset) => ({
    id: asset.id,
    title: asset.title,
    date: formatUploadDate(asset.createdAt),
    status: "uploaded" as const,
    url: asset.url,
    mimeType: asset.mimeType,
  }));
  // Only keep local rows that the backend doesn't represent yet: in-flight uploads and
  // client-side failures. A finished local row has no public URL or mime type, so we drop
  // it in favour of its persisted twin (which carries both — needed to open/preview it).
  const inFlightRows = uploadedAssets.filter((asset) => asset.status !== "uploaded");
  // While a local row is still uploading, the reactive query may already return the finished
  // upload — shadow that persisted twin by name so the row reads "Uploading" → "Uploaded"
  // as one entry instead of flashing both at once.
  const mergedAssets = [
    ...inFlightRows,
    ...persistedRows.filter((asset) => !inFlightRows.some((current) => current.title === asset.title)),
  ];

  async function uploadFiles(files: FileList | File[]) {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    const drafts = fileArray.map((file) => {
      const sizeError = getProjectAssetSizeError(file);
      const validationError = sizeError ?? validateUploadFile("project-asset", file);
      return {
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        title: file.name,
        date: formatUploadDate(Date.now()),
        status: validationError ? ("failed" as const) : ("uploading" as const),
        error: validationError ?? undefined,
        mimeType: getNormalizedMimeType(file),
      };
    });

    setUploadedAssets((current) => [...drafts.map(({ mimeType: _mimeType, ...row }) => row), ...current]);
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
              asset.id === draft.id ? { ...asset, id: key, status: "uploaded" } : asset,
            ),
          );
        } catch (error) {
          setUploadedAssets((current) =>
            current.map((asset) =>
              asset.id === draft.id
                ? {
                    ...asset,
                    status: "failed",
                    error: toUserFacingErrorMessage(error, "Upload failed. Please try again."),
                  }
                : asset,
            ),
          );
        }
      }),
    );
  }

  async function deleteAsset(key: string) {
    if (!projectId) return;
    setDeleteError(null);
    const previous = uploadedAssets;
    // Optimistically drop any in-flight row; persisted rows disappear when the
    // reactive listProjectAssets query updates after the mutation succeeds.
    setUploadedAssets((current) => current.filter((asset) => asset.id !== key));
    try {
      await r2DeleteProjectAsset({ projectId: projectId as Id<"projects">, key });
    } catch (error) {
      setUploadedAssets(previous);
      setDeleteError(toUserFacingErrorMessage(error, "Could not delete that file. Please try again."));
    }
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
    uploadedAssets: mergedAssets,
    isDragActive,
    setIsDragActive,
    handleDrop,
    handleInputChange,
    uploadFiles,
    deleteAsset,
    deleteError,
  };
}
