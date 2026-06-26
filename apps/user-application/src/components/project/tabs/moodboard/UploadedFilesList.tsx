import { useState } from "react";
import { PhotoLightbox } from "@/components/project/PhotoLightbox";
import { formatUploadedFileSize, mockUploadedFiles } from "@/mock/project/moodboard";
import { FolderUploadIcon, TrashIcon } from "./moodboardIcons";

type UploadedFile = { id: string; name: string; sizeBytes: number; previewUrl?: string };

export function UploadedFilesList({
  files = mockUploadedFiles,
  onDelete,
}: {
  files?: ReadonlyArray<UploadedFile>;
  onDelete?: (fileId: string) => void;
}) {
  const [preview, setPreview] = useState<{ src: string; name: string } | null>(null);

  return (
    <div className="w-full rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
      <div className="px-2 py-2 text-[13px] font-medium leading-[1.25] text-[#0A0A0A]">
        Uploaded Files
      </div>
      <div className="flex flex-col gap-1">
        {files.map((file) => {
          const previewUrl = file.previewUrl;
          return (
            <div
              key={file.id}
              className="flex items-center justify-between rounded-[8px] bg-white p-2 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]"
            >
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <FolderUploadIcon />
                {previewUrl ? (
                  <button
                    type="button"
                    onClick={() => setPreview({ src: previewUrl, name: file.name })}
                    className="truncate text-left text-[13px] font-medium leading-[1.25] text-[#171717] underline-offset-2 hover:underline"
                    aria-label={`Preview ${file.name}`}
                  >
                    {file.name}
                  </button>
                ) : (
                  <span className="truncate text-[13px] font-medium leading-[1.25] text-[#171717]">
                    {file.name}
                  </span>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="text-[12px] font-medium leading-[1.25] text-[#737373]">
                  {formatUploadedFileSize(file.sizeBytes)}
                </span>
                <button
                  type="button"
                  className="flex h-5 w-5 items-center justify-center"
                  onClick={() => onDelete?.(file.id)}
                  aria-label={`Remove ${file.name}`}
                >
                  <TrashIcon />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {preview ? (
        <PhotoLightbox src={preview.src} label={preview.name} onClose={() => setPreview(null)} />
      ) : null}
    </div>
  );
}
