import { useState } from "react";
import { PhotoLightbox } from "@/components/project/PhotoLightbox";
import type { UploadedAssetRow } from "@/types/project/assetsTab";
import { CalendarIcon, PdfIcon } from "./assetsIcons";

export function UploadedGrid({
  uploads,
  onDelete,
}: {
  uploads: UploadedAssetRow[];
  onDelete?: (key: string) => void;
}) {
  const [preview, setPreview] = useState<{ src: string; title: string } | null>(null);

  if (uploads.length === 0) {
    return (
      <p className="px-4 pb-4 text-[13px] font-medium leading-[1.25] text-[#737373]">
        No uploaded files yet. Use the dropzone above to add assets.
      </p>
    );
  }

  return (
    <div className="grid gap-1 lg:grid-cols-2">
      {uploads.map((upload) => {
        const url = upload.url ?? undefined;
        const isImage = Boolean(url) && (upload.mimeType?.startsWith("image/") ?? false);
        const canOpen = Boolean(url) && upload.status === "uploaded";

        function open() {
          if (!url) return;
          if (isImage) {
            setPreview({ src: url, title: upload.title });
          } else {
            window.open(url, "_blank", "noreferrer");
          }
        }

        return (
          <article
            key={upload.id}
            className="flex min-h-[54px] items-start justify-between gap-3 rounded-[8px] bg-white p-4 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]"
          >
            <button
              type="button"
              onClick={canOpen ? open : undefined}
              disabled={!canOpen}
              className={`flex min-w-0 flex-1 items-start gap-3 text-left ${canOpen ? "cursor-pointer" : "cursor-default"}`}
              aria-label={canOpen ? `Preview ${upload.title}` : upload.title}
            >
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[4px] bg-[#E5E5E5] p-1 text-[#525252]">
                <PdfIcon />
              </div>

              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                  <h3 className={`truncate text-[13px] font-medium leading-[1.25] text-[#171717] ${canOpen ? "underline-offset-2 group-hover:underline" : ""}`}>
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
            </button>

            {onDelete ? (
              <button
                type="button"
                onClick={() => onDelete(upload.id)}
                aria-label={`Delete ${upload.title}`}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] text-[#737373] transition-colors hover:bg-[#FEF2F2] hover:text-[#EF4444]"
              >
                <svg viewBox="0 0 16 16" fill="none" className="h-[15px] w-[15px]" aria-hidden="true">
                  <path d="M3 4.5h10M6.5 4.5V3.5a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v1M5 4.5l.5 8a1 1 0 0 0 1 .95h3a1 1 0 0 0 1-.95l.5-8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            ) : null}
          </article>
        );
      })}

      {preview ? (
        <PhotoLightbox src={preview.src} label={preview.title} onClose={() => setPreview(null)} />
      ) : null}
    </div>
  );
}
