import { useRef, useState, type DragEvent } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/lib/convex";
import {
  getNormalizedMimeType,
  PROJECT_ASSET_ACCEPT,
  uploadFileToR2,
  validateUploadFile,
} from "@/lib/r2Uploads";
import { formatTimestamp } from "@/components/project/ProjectAiModulePrimitives";
import type { Id } from "../../../convex/_generated/dataModel";
import type { ProjectAiArtifact } from "@/types/ai";
import {
  AssetsPanelChrome,
  AssetsUploadDropzone,
  AssetsViewTabs,
  DocumentAssetCardUi,
  type AssetPanelView,
  UploadedAssetCardUi,
  WireframeAssetCardUi,
  type UploadedAssetRow,
} from "@/components/project/assets/AssetsTabLayout";

type AssetsTabProps = {
  projectId: Id<"projects">;
  projectName: string;
};

const FALLBACK_WIREFRAMES = [
  { name: "Homepage Wireframe", date: "6th April, 2025", priority: "P0" },
  { name: "Homepage Wireframe", date: "6th April, 2025", priority: "P0" },
  { name: "Homepage Wireframe", date: "6th April, 2025", priority: "P0" },
  { name: "Homepage Wireframe", date: "6th April, 2025", priority: "P0" },
  { name: "Homepage Wireframe", date: "6th April, 2025", priority: "P0" },
  { name: "Homepage Wireframe", date: "6th April, 2025", priority: "P0" },
] as const;

export function AssetsTab({ projectId, projectName: _projectName }: AssetsTabProps) {
  const generateArtifacts = useQuery(api.projectAi.listArtifacts, { projectId, module: "generate" }) as
    | ProjectAiArtifact[]
    | undefined;
  const researchArtifacts = useQuery(api.projectAi.listArtifacts, { projectId, module: "research" }) as
    | ProjectAiArtifact[]
    | undefined;
  const strategyArtifacts = useQuery(api.projectAi.listArtifacts, { projectId, module: "strategy" }) as
    | ProjectAiArtifact[]
    | undefined;
  const r2GenerateUploadUrl = useMutation(api.r2.generateUploadUrl);
  const r2SyncMetadata = useMutation(api.r2.syncMetadata);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const [view, setView] = useState<AssetPanelView>("wireframes");
  const [uploadedAssets, setUploadedAssets] = useState<UploadedAssetRow[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);

  const wireframes =
    (generateArtifacts ?? []).length > 0
      ? (generateArtifacts ?? []).map((artifact, index) => ({
          id: artifact.id,
          name: artifact.title || "Homepage Wireframe",
          date: formatTimestamp(artifact.updatedAt),
          priority: index < 4 ? "P0" : "P1",
          externalUrl: artifact.externalUrl,
        }))
      : FALLBACK_WIREFRAMES.map((asset, index) => ({
          id: `fallback-${index}`,
          name: asset.name,
          date: asset.date,
          priority: asset.priority,
          externalUrl: null,
        }));

  const documents = [
    ...(researchArtifacts ?? []).map((artifact) => ({
      id: artifact.id,
      name: artifact.title || "Brand Research Report",
      description: artifact.summary || "Company overview, competitors, market insights",
      date: formatTimestamp(artifact.updatedAt),
      status: artifact.status === "ready" ? "Complete" : artifact.externalUrl ? "Shared" : "Saved",
    })),
    ...(strategyArtifacts ?? []).map((artifact) => ({
      id: artifact.id,
      name: artifact.title || "Strategy Report",
      description: artifact.summary || "Goals, user journey, conversion approach",
      date: formatTimestamp(artifact.updatedAt),
      status: artifact.status === "ready" ? "Complete" : artifact.externalUrl ? "Shared" : "Saved",
    })),
  ];

  const documentsForGrid = documents.length > 0 ? documents : DEFAULT_DOCUMENTS;
  const uploadsForGrid = uploadedAssets.length > 0 ? uploadedAssets : DEFAULT_UPLOADS;

  const panelTitle =
    view === "wireframes" ? "Wireframes" : view === "documents" ? "Documents" : "Uploaded";

  async function uploadFiles(files: FileList | File[]) {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    const drafts = fileArray.map((file) => {
      const sizeError = getProjectAssetSizeError(file);
      const validationError = sizeError ?? validateUploadFile("project-asset", file);
      return {
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        name: file.name,
        size: file.size,
        mimeType: getNormalizedMimeType(file),
        key: null as string | null,
        status: validationError ? "failed" : "uploading",
        error: validationError ?? undefined,
      };
    });

    const rows: UploadedAssetRow[] = drafts.map(({ mimeType: _mimeType, ...row }) => ({
      ...row,
      status: row.status as UploadedAssetRow["status"],
    }));
    setUploadedAssets((current) => [...rows, ...current]);
    setView("uploaded");

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
          });
          setUploadedAssets((current) =>
            current.map((asset) => (asset.id === draft.id ? { ...asset, key, status: "uploaded" } : asset)),
          );
        } catch (error) {
          setUploadedAssets((current) =>
            current.map((asset) =>
              asset.id === draft.id
                ? { ...asset, status: "failed", error: error instanceof Error ? error.message : "Upload failed." }
                : asset,
            ),
          );
        }
      }),
    );
  }

  function handleDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    setIsDragActive(false);
    void uploadFiles(event.dataTransfer.files);
  }

  return (
    <div className="space-y-5 pb-20">
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={PROJECT_ASSET_ACCEPT}
        className="hidden"
        onChange={(event) => {
          if (event.target.files) void uploadFiles(event.target.files);
          event.currentTarget.value = "";
        }}
      />

      <AssetsUploadDropzone
        inputRef={inputRef}
        isDragActive={isDragActive}
        onDragState={setIsDragActive}
        onDrop={handleDrop}
      />

      <AssetsPanelChrome title={panelTitle}>
        <AssetsViewTabs
          view={view}
          onViewChange={setView}
          wireframeCount={wireframes.length}
          documentCount={documentsForGrid.length}
          uploadedCount={uploadsForGrid.length}
        />

        <div className="mt-6">
          {view === "wireframes" ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {wireframes.map((asset) => (
                <WireframeAssetCardUi
                  key={asset.id}
                  name={asset.name}
                  date={asset.date}
                  priorityLabel={asset.priority}
                  externalUrl={asset.externalUrl}
                />
              ))}
            </div>
          ) : null}

          {view === "documents" ? (
            <div className="grid gap-4 md:grid-cols-2">
              {documentsForGrid.map((asset) => (
                <DocumentAssetCardUi
                  key={asset.id}
                  name={asset.name}
                  description={asset.description}
                  date={asset.date}
                  status={asset.status}
                />
              ))}
            </div>
          ) : null}

          {view === "uploaded" ? (
            <div className="grid gap-4 md:grid-cols-2">
              {uploadsForGrid.map((asset) => (
                <UploadedAssetCardUi key={asset.id} asset={asset} />
              ))}
            </div>
          ) : null}
        </div>
      </AssetsPanelChrome>
    </div>
  );
}

function getProjectAssetSizeError(file: File) {
  const lower = file.name.toLowerCase();
  const maxBytes = /\.(ttf|otf|woff|woff2)$/.test(lower)
    ? 10 * 1024 * 1024
    : /\.(jpg|jpeg|png|webp|svg|gif)$/.test(lower)
      ? 15 * 1024 * 1024
      : /\.(fig|sketch|zip)$/.test(lower)
        ? 50 * 1024 * 1024
        : 25 * 1024 * 1024;

  return file.size > maxBytes ? `This file is too large. Max size is ${formatBytes(maxBytes)}.` : null;
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))}KB`;
  return `${Math.round((bytes / (1024 * 1024)) * 10) / 10}MB`;
}

const DEFAULT_DOCUMENTS = [
  {
    id: "default-research",
    name: "Brand Research Report",
    description: "Company overview, competitors, market insights",
    date: "April 2",
    status: "Complete",
  },
  {
    id: "default-shared",
    name: "Brand Research Report",
    description: "Company overview, competitors, market insights",
    date: "April 2",
    status: "Shared",
  },
] satisfies Array<{ id: string; name: string; description: string; date: string; status: string }>;

const DEFAULT_UPLOADS: UploadedAssetRow[] = [
  {
    id: "upload-1",
    name: "Client Brief.pdf",
    size: 2_300_000,
    status: "uploaded",
  },
  {
    id: "upload-2",
    name: "Client Brief.pdf",
    size: 2_300_000,
    status: "uploaded",
  },
];
