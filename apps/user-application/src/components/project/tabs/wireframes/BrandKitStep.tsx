import { useRef, useState, type DragEvent } from "react";
import { formatUploadSize } from "@stage/data-ops/shared/upload-rules";
import type { BrandKitFile } from "@/hooks/project/wireframes/useWireframeBrandKit";
import { PanelTitle, PrimaryButton } from "./WireframePrimitives";
import { ArrowRightIcon, TrashIcon, UploadFromDeviceIcon } from "./wireframesIcons";

export function BrandKitStep({
  files,
  accept,
  isUploading,
  error,
  onUploadFiles,
  onRemove,
  onContinue,
}: {
  files: BrandKitFile[];
  accept: string;
  isUploading: boolean;
  error: string | null;
  onUploadFiles: (files: FileList | File[]) => void;
  onRemove: (id: string) => void;
  onContinue: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragActive, setIsDragActive] = useState(false);

  const hasUploadedFile = files.some((file) => file.status === "uploaded");

  function handleDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    setIsDragActive(false);
    if (event.dataTransfer.files.length > 0) {
      onUploadFiles(event.dataTransfer.files);
    }
  }

  return (
    <div className="flex w-[357px] flex-col gap-[6px]">
      <PanelTitle
        title="Upload Your Brand Kit"
        description="Select how you want your wireframe to look like."
      />
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        className="hidden"
        onChange={(event) => {
          if (event.target.files) onUploadFiles(event.target.files);
          event.currentTarget.value = "";
        }}
      />
      <div className="rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragActive(true);
          }}
          onDragLeave={() => setIsDragActive(false)}
          onDrop={handleDrop}
          className={`flex h-[172px] w-full flex-col items-center justify-center gap-3 rounded-[8px] p-11 text-center shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-colors ${
            isDragActive ? "bg-[#F0EEFF]" : "bg-white hover:bg-[#FAFAFA]"
          }`}
        >
          <UploadFromDeviceIcon className="h-5 w-5" />
          <span className="flex flex-col gap-[6px]">
            <span className="text-[13px] font-medium leading-[1.25] text-[#171717]">
              Upload files or drag and drop
            </span>
            <span className="text-[12px] font-medium leading-[1.25] text-[#737373]">
              Images, PDFs, Fonts, Files etc.
            </span>
          </span>
        </button>
      </div>
      {files.map((file) => (
        <div
          key={file.id}
          className="w-[348px] max-w-full rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]"
        >
          <div className="flex min-h-9 items-center justify-between rounded-[8px] bg-white p-2 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
            <div className="flex min-w-0 items-center gap-2">
              <UploadFromDeviceIcon className="h-5 w-5" />
              <span className="truncate pb-px text-[13px] font-medium leading-[1.2] text-[#171717]">
                {file.name}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className="pb-px text-[12px] font-medium leading-[1.2] text-[#737373]">
                {file.status === "uploading"
                  ? "Uploading…"
                  : file.status === "failed"
                    ? "Failed"
                    : formatUploadSize(file.sizeBytes)}
              </span>
              <button
                type="button"
                onClick={() => onRemove(file.id)}
                className="text-[#EF4444] transition-opacity hover:opacity-70"
                aria-label={`Remove ${file.name}`}
              >
                <TrashIcon />
              </button>
            </div>
          </div>
          {file.status === "failed" ? (
            <p className="px-2 pt-1 text-[11px] font-medium leading-[1.3] text-[#EF4444]">{file.error}</p>
          ) : null}
        </div>
      ))}
      {error ? (
        <p className="text-[12px] font-medium leading-[1.3] text-[#EF4444]">{error}</p>
      ) : null}
      <PrimaryButton
        disabled={!hasUploadedFile || isUploading}
        onClick={onContinue}
        className="w-full"
      >
        Continue
        <ArrowRightIcon />
      </PrimaryButton>
    </div>
  );
}
