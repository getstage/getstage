import { useRef, useState, type DragEvent, type ReactNode } from "react";
import { useMutation, useQuery } from "convex/react";
import { FigmaLogo, FileText, FolderSimple, ImageSquare, UploadSimple } from "@phosphor-icons/react";
import { api } from "@/lib/convex";
import {
  getNormalizedMimeType,
  PROJECT_ASSET_ACCEPT,
  uploadFileToR2,
  validateUploadFile,
} from "@/lib/r2Uploads";
import {
  AiGeneratedMeta,
  formatTimestamp,
  ModulePanel,
  PrimaryButton,
  StatusPill,
  WhiteCard,
} from "@/components/project/ProjectAiModulePrimitives";
import { cn } from "@/lib/utils";
import type { Id } from "../../../convex/_generated/dataModel";
import type { ProjectAiArtifact } from "@/types/ai";

type AssetsTabProps = {
  projectId: Id<"projects">;
  projectName: string;
};

type AssetView = "wireframes" | "documents" | "uploaded";

type UploadedAsset = {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  key: string | null;
  status: "uploading" | "uploaded" | "failed";
  error?: string;
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
  const generateArtifacts = useQuery(api.projectAi.listArtifacts, { projectId, module: "generate" }) as ProjectAiArtifact[] | undefined;
  const researchArtifacts = useQuery(api.projectAi.listArtifacts, { projectId, module: "research" }) as ProjectAiArtifact[] | undefined;
  const strategyArtifacts = useQuery(api.projectAi.listArtifacts, { projectId, module: "strategy" }) as ProjectAiArtifact[] | undefined;
  const r2GenerateUploadUrl = useMutation(api.r2.generateUploadUrl);
  const r2SyncMetadata = useMutation(api.r2.syncMetadata);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const [view, setView] = useState<AssetView>("wireframes");
  const [uploadedAssets, setUploadedAssets] = useState<UploadedAsset[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);

  const wireframes = (generateArtifacts ?? []).length > 0
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
        key: null,
        status: validationError ? "failed" : "uploading",
        error: validationError ?? undefined,
      } satisfies UploadedAsset;
    });

    setUploadedAssets((current) => [...drafts, ...current]);
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
          setUploadedAssets((current) => current.map((asset) => (
            asset.id === draft.id ? { ...asset, key, status: "uploaded" } : asset
          )));
        } catch (error) {
          setUploadedAssets((current) => current.map((asset) => (
            asset.id === draft.id
              ? { ...asset, status: "failed", error: error instanceof Error ? error.message : "Upload failed." }
              : asset
          )));
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
    <div className="space-y-[18px] pb-20">
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

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragActive(true);
        }}
        onDragLeave={() => setIsDragActive(false)}
        onDrop={handleDrop}
        className={cn(
          "w-full rounded-[12px] border-2 border-dashed border-[#D4D4D4] bg-white text-left shadow-[0_0.45px_1px_rgba(10,10,10,0.15)] transition-colors hover:border-[#7B76DF] hover:bg-[#FAFAFF]",
          isDragActive && "border-[#7B76DF] bg-[#FAFAFF]",
        )}
      >
        <div className="flex min-h-[164px] items-center justify-center px-6 py-11">
          <div className="flex max-w-[190px] flex-col items-center gap-3 text-center">
            <UploadSimple size={24} weight="fill" className="text-[#525252]" />
            <div className="space-y-1.5">
              <p className="text-[15px] font-medium leading-none text-[#171717]">
                Upload files or drag and drop
              </p>
              <p className="whitespace-nowrap text-[12px] font-medium leading-[1.5] text-[#737373]">
                Images, PDFs, Fonts, Files etc.
              </p>
            </div>
          </div>
        </div>
      </button>

      <ModulePanel
        title={view === "wireframes" ? "Wireframes" : view === "documents" ? "Documents" : "Uploaded Documents"}
        bodyClassName="p-3"
      >
        <div className="mb-4 flex w-fit rounded-[8px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
          <AssetTab active={view === "wireframes"} onClick={() => setView("wireframes")}>
            Wireframes ({wireframes.length})
          </AssetTab>
          <AssetTab active={view === "documents"} onClick={() => setView("documents")}>
            Documents ({Math.max(documents.length, 2)})
          </AssetTab>
          <AssetTab active={view === "uploaded"} onClick={() => setView("uploaded")}>
            Uploaded ({Math.max(uploadedAssets.length, 3)})
          </AssetTab>
        </div>

        {view === "wireframes" ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {wireframes.map((asset) => (
              <WireframeAssetCard key={asset.id} asset={asset} />
            ))}
          </div>
        ) : null}

        {view === "documents" ? (
          <div className="grid gap-3 md:grid-cols-2">
            {(documents.length > 0 ? documents : DEFAULT_DOCUMENTS).map((asset) => (
              <DocumentAssetCard key={asset.id} asset={asset} />
            ))}
          </div>
        ) : null}

        {view === "uploaded" ? (
          <div className="grid gap-3 md:grid-cols-2">
            {(uploadedAssets.length > 0 ? uploadedAssets : DEFAULT_UPLOADS).map((asset) => (
              <UploadedAssetCard key={asset.id} asset={asset} />
            ))}
          </div>
        ) : null}
      </ModulePanel>
    </div>
  );
}

function AssetTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center gap-2 rounded-[6px] px-3 text-[13px] font-medium transition-colors",
        active ? "bg-white text-[#171717] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]" : "text-[#737373] hover:bg-white",
      )}
    >
      <FolderSimple size={14} weight={active ? "fill" : "regular"} />
      {children}
    </button>
  );
}

function WireframeAssetCard({
  asset,
}: {
  asset: { name: string; date: string; priority: string; externalUrl: string | null };
}) {
  return (
    <WhiteCard className="flex h-[336px] min-w-0 flex-col rounded-[8px] border-0 p-0.5">
      <div className="flex min-h-0 flex-1 items-center justify-center rounded-[6px] bg-[#E5E5E5] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
        <ImageSquare size={24} className="text-[#525252]" />
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1.5">
            <p className="truncate text-[15px] font-medium leading-none text-[#171717]">
              {asset.name}
            </p>
            <AiGeneratedMeta />
          </div>
          <span className="shrink-0 whitespace-nowrap text-[12px] font-medium leading-[1.5] text-[#737373]">
            {asset.date}
          </span>
        </div>
        <div className="mt-4 flex items-center justify-between gap-3">
          <StatusPill tone="purple" className="h-7 text-[12px]">{asset.priority}</StatusPill>
          <PrimaryButton
            className="h-8"
            onClick={() => {
              if (asset.externalUrl) window.open(asset.externalUrl, "_blank", "noopener,noreferrer");
            }}
          >
            <FigmaLogo size={14} />
            Open in Figma
          </PrimaryButton>
        </div>
      </div>
    </WhiteCard>
  );
}

function DocumentAssetCard({
  asset,
}: {
  asset: { name: string; description: string; date: string; status: string };
}) {
  return (
    <WhiteCard className="flex items-center justify-between gap-4 border-0 p-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] bg-[#E6F0FF] text-[#1877F2]">
          <FileText size={16} weight="fill" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-[15px] font-medium leading-none text-[#171717]">{asset.name}</p>
          <p className="mt-2 truncate text-[12px] font-medium text-[#737373]">{asset.description}</p>
          <p className="mt-2 text-[12px] font-medium text-[#737373]">{asset.date}</p>
        </div>
      </div>
      <StatusPill tone={asset.status === "Complete" ? "success" : asset.status === "Shared" ? "purple" : "neutral"} className="h-7 text-[12px]">
        {asset.status}
      </StatusPill>
    </WhiteCard>
  );
}

function UploadedAssetCard({ asset }: { asset: UploadedAsset }) {
  return (
    <WhiteCard className="flex items-center justify-between gap-4 border-0 p-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] bg-[#F5F5F5] text-[#525252]">
          <FileText size={16} weight="fill" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-[15px] font-medium leading-none text-[#171717]">{asset.name}</p>
          <p className="mt-2 text-[12px] font-medium text-[#737373]">
            {formatBytes(asset.size)}
          </p>
          {asset.error ? <p className="mt-1 text-[12px] text-destructive">{asset.error}</p> : null}
        </div>
      </div>
      <StatusPill tone={asset.status === "uploaded" ? "neutral" : asset.status === "failed" ? "danger" : "purple"} className="h-7 text-[12px]">
        {asset.status === "uploading" ? "Uploading" : asset.status === "uploaded" ? "Uploaded" : "Failed"}
      </StatusPill>
    </WhiteCard>
  );
}

function getProjectAssetSizeError(file: File) {
  const lower = file.name.toLowerCase();
  const maxBytes =
    /\.(ttf|otf|woff|woff2)$/.test(lower)
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

const DEFAULT_UPLOADS: UploadedAsset[] = [
  { id: "upload-1", name: "Client Brief.pdf", size: 2_300_000, mimeType: "application/pdf", key: null, status: "uploaded" },
  { id: "upload-2", name: "Client Brief.pdf", size: 2_300_000, mimeType: "application/pdf", key: null, status: "uploaded" },
];
