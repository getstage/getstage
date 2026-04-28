import type { DragEvent, ReactNode } from "react";
import figmaIcon from "@/assets/icons/figma.svg";
import {
  PrimaryButton,
  StatusPill,
  WhiteCard,
} from "@/components/project/ProjectAiModulePrimitives";
import { cn } from "@/lib/utils";
import { PROJECT_LOGO } from "./logoPaths";

export type AssetPanelView = "wireframes" | "documents" | "uploaded";

export function AssetsUploadDropzone({
  isDragActive,
  inputRef,
  onDragState,
  onDrop,
}: {
  isDragActive: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onDragState: (active: boolean) => void;
  onDrop: (event: DragEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      onDragOver={(event) => {
        event.preventDefault();
        onDragState(true);
      }}
      onDragLeave={() => onDragState(false)}
      onDrop={onDrop}
      className={cn(
        "w-full rounded-[12px] border-2 border-dashed border-[#5C56D4]/70 bg-white text-left shadow-[0_0.45px_1px_rgba(10,10,10,0.12)] transition-colors",
        "hover:border-[#5C56D4] hover:bg-[#FAFAFF]",
        isDragActive && "border-[#5C56D4] bg-[#F0EFFF]/60",
      )}
    >
      <div className="flex min-h-[168px] items-center justify-center px-6 py-12">
        <div className="flex max-w-[220px] flex-col items-center gap-3 text-center">
          <img src={PROJECT_LOGO.upload} alt="" className="h-8 w-8 brightness-0 opacity-45" />
          <div className="space-y-1.5">
            <p className="text-[15px] font-semibold leading-tight text-[#171717]">
              Upload files or drag and drop
            </p>
            <p className="text-[12px] font-medium leading-[1.5] text-[#737373]">
              Images, PDFs, Fonts, Files etc.
            </p>
          </div>
        </div>
      </div>
    </button>
  );
}

export function AssetsPanelChrome({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
      <div className="rounded-[10px] bg-white p-5 shadow-[0_0.45px_1px_rgba(10,10,10,0.15)] sm:p-6">
        <h2 className="text-[22px] font-semibold leading-tight tracking-tight text-[#171717]">
          {title}
        </h2>
        {children}
      </div>
    </section>
  );
}

export function AssetsViewTabs({
  view,
  onViewChange,
  wireframeCount,
  documentCount,
  uploadedCount,
}: {
  view: AssetPanelView;
  onViewChange: (next: AssetPanelView) => void;
  wireframeCount: number;
  documentCount: number;
  uploadedCount: number;
}) {
  return (
    <div
      className="mt-5 inline-flex w-full max-w-full flex-wrap gap-1 rounded-[10px] bg-[#F5F5F5] p-1 sm:w-auto"
      role="tablist"
      aria-label="Asset categories"
    >
      <AssetTabPill
        active={view === "wireframes"}
        onClick={() => onViewChange("wireframes")}
        icon={PROJECT_LOGO.wireframe}
      >
        Wireframes ({wireframeCount})
      </AssetTabPill>
      <AssetTabPill
        active={view === "documents"}
        onClick={() => onViewChange("documents")}
        icon={PROJECT_LOGO.documents}
      >
        Documents ({documentCount})
      </AssetTabPill>
      <AssetTabPill
        active={view === "uploaded"}
        onClick={() => onViewChange("uploaded")}
        icon={PROJECT_LOGO.upload}
      >
        Uploaded ({uploadedCount})
      </AssetTabPill>
    </div>
  );
}

function AssetTabPill({
  active,
  onClick,
  children,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  icon: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-9 shrink-0 items-center gap-2 rounded-[8px] px-3.5 text-[13px] font-medium transition-colors",
        active
          ? "bg-[#404040] text-white shadow-[0_1px_2px_rgba(0,0,0,0.12)]"
          : "text-[#525252] hover:bg-white/80",
      )}
    >
      <img
        src={icon}
        alt=""
        className={cn("h-3.5 w-3.5", active ? "opacity-100" : "brightness-0 opacity-50")}
      />
      {children}
    </button>
  );
}

export function WireframeAssetCardUi({
  name,
  date,
  priorityLabel,
  externalUrl,
}: {
  name: string;
  date: string;
  priorityLabel: string;
  externalUrl: string | null;
}) {
  const canOpen = Boolean(externalUrl);

  return (
    <WhiteCard className="flex min-w-0 flex-col overflow-hidden rounded-[10px] border border-[#ECECEC] p-0 shadow-[0_0.45px_1px_rgba(10,10,10,0.1)]">
      <div className="flex aspect-[4/3] max-h-[200px] items-center justify-center bg-[#F9FAFB]">
        <img src={PROJECT_LOGO.placeholder} alt="" className="h-10 w-10 brightness-0 opacity-35" />
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <p className="min-w-0 flex-1 truncate text-[15px] font-semibold leading-tight text-[#171717]">
            {name}
          </p>
          <span className="shrink-0 whitespace-nowrap text-[12px] font-medium text-[#737373]">
            {date}
          </span>
        </div>
        <div className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-medium text-[#737373]">
          <img src={PROJECT_LOGO.sparkles} alt="" className="h-3.5 w-3.5 brightness-0 opacity-45" />
          AI Generated
        </div>
        <div className="mt-4 flex items-center justify-between gap-3">
          <span
            className={cn(
              "inline-flex h-7 items-center rounded-md px-2.5 text-[12px] font-semibold",
              "bg-[#F0EFFF] text-[#5C56D4]",
            )}
          >
            {priorityLabel}
          </span>
          <PrimaryButton
            className="h-8 shrink-0 gap-1.5 px-3 text-[12px]"
            disabled={!canOpen}
            onClick={() => {
              if (externalUrl) window.open(externalUrl, "_blank", "noopener,noreferrer");
            }}
          >
            <img src={figmaIcon} alt="" className="h-[13px] w-auto" />
            Open in Figma
          </PrimaryButton>
        </div>
      </div>
    </WhiteCard>
  );
}

export function DocumentAssetCardUi({
  name,
  description,
  date,
  status,
}: {
  name: string;
  description: string;
  date: string;
  status: string;
}) {
  return (
    <WhiteCard className="flex items-center justify-between gap-4 rounded-[10px] border border-[#ECECEC] p-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-[#F0EFFF]">
          <img src={PROJECT_LOGO.pdf} alt="" className="h-5 w-5 brightness-0 opacity-70" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold leading-tight text-[#171717]">{name}</p>
          <p className="mt-1.5 truncate text-[12px] font-medium text-[#737373]">{description}</p>
          <p className="mt-1.5 text-[12px] font-medium text-[#737373]">{date}</p>
        </div>
      </div>
      <StatusPill
        tone={status === "Complete" ? "success" : status === "Shared" ? "purple" : "neutral"}
        className="h-7 shrink-0 text-[12px]"
      >
        {status}
      </StatusPill>
    </WhiteCard>
  );
}

export type UploadedAssetRow = {
  id: string;
  name: string;
  size: number;
  status: "uploading" | "uploaded" | "failed";
  error?: string;
  key?: string | null;
};

export function UploadedAssetCardUi({ asset }: { asset: UploadedAssetRow }) {
  return (
    <WhiteCard className="flex items-center justify-between gap-4 rounded-[10px] border border-[#ECECEC] p-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-[#F5F5F5]">
          <img src={PROJECT_LOGO.documents} alt="" className="h-5 w-5 brightness-0 opacity-50" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold leading-tight text-[#171717]">{asset.name}</p>
          <p className="mt-1.5 text-[12px] font-medium text-[#737373]">{formatBytes(asset.size)}</p>
          {asset.error ? <p className="mt-1 text-[12px] text-destructive">{asset.error}</p> : null}
        </div>
      </div>
      <StatusPill
        tone={
          asset.status === "uploaded" ? "neutral" : asset.status === "failed" ? "danger" : "purple"
        }
        className="h-7 shrink-0 text-[12px]"
      >
        {asset.status === "uploading" ? "Uploading" : asset.status === "uploaded" ? "Uploaded" : "Failed"}
      </StatusPill>
    </WhiteCard>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))}KB`;
  return `${Math.round((bytes / (1024 * 1024)) * 10) / 10}MB`;
}
