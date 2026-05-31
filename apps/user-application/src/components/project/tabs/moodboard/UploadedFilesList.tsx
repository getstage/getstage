import { formatUploadedFileSize, mockUploadedFiles } from "@/mock/project/moodboard";
import { FolderUploadIcon, TrashIcon } from "./moodboardIcons";

export function UploadedFilesList({
  files = mockUploadedFiles,
}: {
  files?: ReadonlyArray<{ id: string; name: string; sizeBytes: number }>;
}) {
  return (
    <div className="w-full rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
      <div className="px-2 py-2 text-[13px] font-medium leading-[1.25] text-[#0A0A0A]">
        Uploaded Files
      </div>
      <div className="flex flex-col gap-1">
        {files.map((file) => (
          <div
            key={file.id}
            className="flex items-center justify-between rounded-[8px] bg-white p-2 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]"
          >
            <div className="flex min-w-0 items-center gap-2">
              <FolderUploadIcon />
              <span className="truncate text-[13px] font-medium leading-[1.25] text-[#171717]">
                {file.name}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className="text-[12px] font-medium leading-[1.25] text-[#737373]">
                {formatUploadedFileSize(file.sizeBytes)}
              </span>
              <TrashIcon />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
