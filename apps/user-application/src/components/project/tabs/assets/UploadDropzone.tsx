import type { ChangeEvent, DragEvent } from "react";
import { UploadFolderIcon } from "./assetsIcons";

export function UploadDropzone({
  accept,
  isDragActive,
  onDragState,
  onDrop,
  onInputChange,
}: {
  accept: string;
  isDragActive: boolean;
  onDragState: (active: boolean) => void;
  onDrop: (event: DragEvent<HTMLLabelElement>) => void;
  onInputChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div
      className={`group w-full rounded-[12px] bg-[#F5F5F5] p-1 text-center shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#EDEDED] ${
        isDragActive ? "ring-2 ring-[#463FBA]/40" : ""
      }`}
    >
      <label
        className="flex min-h-[132px] cursor-pointer items-center justify-center rounded-[8px] bg-white px-6 py-11 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]"
        onDragOver={(event) => {
          event.preventDefault();
          onDragState(true);
        }}
        onDragLeave={() => onDragState(false)}
        onDrop={onDrop}
      >
        <input type="file" multiple accept={accept} className="sr-only" onChange={onInputChange} />
        <span className="flex w-[160px] flex-col items-center gap-3">
          <UploadFolderIcon />
          <span className="flex flex-col items-center gap-[6px]">
            <span className="w-[127px] text-[15px] font-medium leading-[1.25] text-[#171717]">
              Upload files or drag and drop
            </span>
            <span className="whitespace-nowrap text-[12px] font-medium leading-[1.5] text-[#737373]">
              Images, PDFs, Fonts, Files etc.
            </span>
          </span>
        </span>
      </label>
    </div>
  );
}
