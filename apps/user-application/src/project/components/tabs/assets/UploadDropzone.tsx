import type { DragEvent, RefObject } from "react";
import { UploadFolderIcon } from "./assetsIcons";

export function UploadDropzone({
  inputRef,
  isDragActive,
  onDragState,
  onDrop,
}: {
  inputRef: RefObject<HTMLInputElement | null>;
  isDragActive: boolean;
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
      className={`group w-full rounded-[12px] bg-[#F5F5F5] p-1 text-center shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#EDEDED] ${
        isDragActive ? "ring-2 ring-[#463FBA]/40" : ""
      }`}
    >
      <div className="flex min-h-[132px] items-center justify-center rounded-[8px] bg-white px-6 py-11 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
        <div className="flex w-[160px] flex-col items-center gap-3">
          <UploadFolderIcon />
          <div className="flex flex-col items-center gap-[6px]">
            <p className="w-[127px] text-[15px] font-medium leading-[1.25] text-[#171717]">
              Upload files or drag and drop
            </p>
            <p className="whitespace-nowrap text-[12px] font-medium leading-[1.5] text-[#737373]">
              Images, PDFs, Fonts, Files etc.
            </p>
          </div>
        </div>
      </div>
    </button>
  );
}
