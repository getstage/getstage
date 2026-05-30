import { useState, type ChangeEvent, type DragEvent } from "react";
import { PROJECT_ASSET_ACCEPT } from "@/lib/r2Uploads";
import { useProjectAssetUploads } from "../../hooks/useProjectAssetUploads";

type UploadSource = "figma" | "device";

type UploadFileModalProps = {
  onClose: () => void;
  onUploaded?: () => void;
};

export function UploadFileModal({ onClose, onUploaded }: UploadFileModalProps) {
  const [source, setSource] = useState<UploadSource>("device");
  const [figmaLink, setFigmaLink] = useState("");
  const uploads = useProjectAssetUploads(() => {
    onUploaded?.();
    onClose();
  });

  function handleDeviceInputChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files) void uploads.uploadFiles(event.target.files);
    event.currentTarget.value = "";
  }

  function handleDeviceDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    uploads.setIsDragActive(false);
    void uploads.uploadFiles(event.dataTransfer.files);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 p-6 backdrop-blur-[5px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-file-title"
    >
      <button
        type="button"
        aria-label="Close upload modal"
        className="absolute inset-0 cursor-pointer"
        onClick={onClose}
      />
      <div className="relative w-[min(516px,calc(100vw-48px))] rounded-[12px] bg-[#F5F5F5] p-[4px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
        <div className="flex flex-col justify-center p-[12px]">
          <h2 id="upload-file-title" className="text-[15px] font-medium leading-[1.5] text-[#0A0A0A]">
            Upload File
          </h2>
          <p className="text-[13px] font-medium leading-[1.5] text-[#525252]">
            Upload Files to your project
          </p>
        </div>

        <div className="rounded-[8px] bg-white p-[12px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
          <div className="flex flex-col gap-[12px]">
            <div className="flex w-fit gap-[4px] rounded-[8px] bg-[#F5F5F5] p-[2px]">
              <button
                type="button"
                onClick={() => setSource("figma")}
                className={`flex cursor-pointer items-center gap-[8px] rounded-[6px] py-[6px] pl-[10px] pr-[12px] text-[13px] font-medium leading-[1.25] transition-colors ${
                  source === "figma" ? "bg-white text-[#171717]" : "text-[#737373] hover:text-[#171717]"
                }`}
              >
                <FigmaIcon />
                Figma Link
              </button>
              <button
                type="button"
                onClick={() => setSource("device")}
                className={`flex cursor-pointer items-center gap-[8px] rounded-[6px] py-[6px] pl-[10px] pr-[12px] text-[13px] font-medium leading-[1.25] transition-colors ${
                  source === "device" ? "bg-white text-[#171717]" : "text-[#737373] hover:text-[#171717]"
                }`}
              >
                <FolderIcon />
                Upload from Device
              </button>
            </div>

            {source === "figma" ? (
              <div className="flex h-[245px] w-full items-center justify-center rounded-[8px] bg-[#F5F5F5] p-[44px]">
                <div className="flex w-full max-w-[360px] flex-col gap-[12px]">
                  <label className="flex flex-col gap-[6px] text-left">
                    <span className="text-[13px] font-medium leading-[1.25] text-[#171717]">
                      Figma file link
                    </span>
                    <input
                      type="url"
                      value={figmaLink}
                      onChange={(event) => setFigmaLink(event.target.value)}
                      placeholder="https://figma.com/design/..."
                      className="h-[36px] w-full rounded-[6px] bg-white px-[12px] text-[13px] font-medium leading-[1.25] text-[#171717] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] outline-none placeholder:text-[#A3A3A3]"
                    />
                  </label>
                  <button
                    type="button"
                    disabled={!figmaLink.trim()}
                    className="flex h-[34px] w-fit cursor-pointer items-center gap-[8px] rounded-[6px] border border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7B76DF] to-[#463FBA] py-[8px] pl-[10px] pr-[12px] text-[13px] font-medium leading-[1.25] text-[#FAFAFA] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <FigmaIcon />
                    Attach Figma Link
                  </button>
                </div>
              </div>
            ) : (
              <label
                className={`flex h-[245px] w-full cursor-pointer items-center justify-center rounded-[8px] bg-[#F5F5F5] p-[44px] text-center transition-colors hover:bg-[#EFEFEF] ${
                  uploads.isDragActive ? "ring-2 ring-[#463FBA]/40" : ""
                }`}
                onDragOver={(event) => {
                  event.preventDefault();
                  uploads.setIsDragActive(true);
                }}
                onDragLeave={() => uploads.setIsDragActive(false)}
                onDrop={handleDeviceDrop}
              >
                <input
                  type="file"
                  multiple
                  accept={PROJECT_ASSET_ACCEPT}
                  className="sr-only"
                  onChange={handleDeviceInputChange}
                />
                <span className="flex min-w-0 flex-col items-center justify-center gap-[12px]">
                  <FolderIcon />
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FigmaIcon() {
  return (
    <img src="/logos/integrations/figma.svg" alt="" aria-hidden="true" className="h-[15px] w-[10px] shrink-0" />
  );
}

function FolderIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-[15px] w-[15px] shrink-0 text-[#525252]" aria-hidden="true">
      <path d="M3 6.25A2.25 2.25 0 0 1 5.25 4h3.2l1.7 1.75h4.6A2.25 2.25 0 0 1 17 8v5.25A2.25 2.25 0 0 1 14.75 15.5h-9.5A2.25 2.25 0 0 1 3 13.25v-7Z" fill="currentColor" />
    </svg>
  );
}
