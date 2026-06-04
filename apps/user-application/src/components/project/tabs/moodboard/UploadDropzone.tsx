import { FolderUploadIcon } from "./moodboardIcons";

export function UploadDropzone({
  accept,
  disabled,
  onUpload,
}: {
  accept: string;
  disabled?: boolean;
  onUpload: (files: FileList) => void;
}) {
  return (
    <div className="w-full rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
      <label className={`flex h-[245px] w-full items-center justify-center rounded-[8px] bg-white p-[44px] text-center shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-colors ${
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-[#FAFAFA]"
      }`}>
        <input
          type="file"
          multiple
          disabled={disabled}
          className="sr-only"
          accept={accept}
          onChange={(event) => {
            if (event.target.files) {
              onUpload(event.target.files);
            }
            event.currentTarget.value = "";
          }}
        />
        <span className="flex min-w-0 flex-1 flex-col items-center justify-center gap-3">
          <FolderUploadIcon />
          <span className="flex flex-col items-center gap-[6px]">
            <span className="text-[13px] font-medium leading-[1.25] text-[#171717]">
              Upload files or drag and drop
            </span>
            <span className="text-[12px] font-medium leading-[1.25] text-[#737373]">
              Images, PDFs, Fonts, Files etc.
            </span>
          </span>
        </span>
      </label>
    </div>
  );
}
