import type { UploadedAssetRow } from "@/types/project/assetsTab";
import { CalendarIcon, PdfIcon } from "./assetsIcons";

export function UploadedGrid({ uploads }: { uploads: UploadedAssetRow[] }) {
  if (uploads.length === 0) {
    return (
      <p className="px-4 pb-4 text-[13px] font-medium leading-[1.25] text-[#737373]">
        No uploaded files yet. Use the dropzone above to add assets.
      </p>
    );
  }

  return (
    <div className="grid gap-1 lg:grid-cols-2">
      {uploads.map((upload) => (
        <article
          key={upload.id}
          className="flex min-h-[54px] items-start justify-between rounded-[8px] bg-white p-4 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]"
        >
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[4px] bg-[#E5E5E5] p-1 text-[#525252]">
              <PdfIcon />
            </div>

            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <h3 className="truncate text-[13px] font-medium leading-[1.25] text-[#171717]">
                  {upload.title}
                </h3>
                <span
                  className={`shrink-0 rounded-[2px] px-[6px] py-[2px] text-[12px] font-normal leading-[1.25] ${
                    upload.status === "failed"
                      ? "bg-[#FEE2E2] text-[#991B1B]"
                      : upload.status === "uploading"
                        ? "bg-[rgba(0,125,252,0.15)] text-[#007DFC]"
                        : "bg-[rgba(163,163,163,0.25)] text-[#525252]"
                  }`}
                >
                  {upload.status === "failed" ? "Failed" : upload.status === "uploading" ? "Uploading" : "Uploaded"}
                </span>
              </div>
              {upload.error ? (
                <p className="mt-1 truncate text-[12px] font-normal leading-[1.25] text-[#991B1B]">{upload.error}</p>
              ) : null}
              <div className="mt-2 flex items-center gap-2 text-[12px] font-medium leading-[1.25] text-[#737373]">
                <CalendarIcon />
                <span>{upload.date}</span>
              </div>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
