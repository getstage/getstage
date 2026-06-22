import { useState } from "react";

type PhotoLightboxProps = {
  src: string;
  onClose: () => void;
};

export function PhotoLightbox({ src, onClose }: PhotoLightboxProps) {
  const [zoom, setZoom] = useState(1);
  const canZoomIn = zoom < 2;
  const canZoomOut = zoom > 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A0A0A]/80 p-4 backdrop-blur-[6px]"
      role="dialog"
      aria-modal="true"
      aria-label="Research reference preview"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-zoom-out"
        aria-label="Close photo preview"
        onClick={onClose}
      />
      <div className="relative flex h-[calc(100vh-32px)] w-[calc(100vw-32px)] flex-col overflow-hidden rounded-[10px] bg-[#111111] shadow-[0_24px_90px_rgba(0,0,0,0.45)]">
        <div className="flex h-11 shrink-0 items-center justify-between border-b border-white/10 bg-[#171717] px-3">
          <p className="text-[12px] font-medium text-white/75">Refero screen preview</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setZoom((current) => Math.max(1, current - 0.25))}
              disabled={!canZoomOut}
              className="h-7 rounded-[5px] bg-white/10 px-2 text-[12px] font-medium text-white disabled:opacity-40"
            >
              -
            </button>
            <span className="w-10 text-center text-[12px] font-medium text-white/70">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoom((current) => Math.min(2, current + 0.25))}
              disabled={!canZoomIn}
              className="h-7 rounded-[5px] bg-white/10 px-2 text-[12px] font-medium text-white disabled:opacity-40"
            >
              +
            </button>
            <a
              href={src}
              target="_blank"
              rel="noreferrer"
              className="h-7 rounded-[5px] bg-white px-2 py-[7px] text-[12px] font-medium leading-none text-[#111111]"
            >
              Open original
            </a>
            <button
              type="button"
              onClick={onClose}
              className="h-7 rounded-[5px] bg-white/10 px-2 text-[12px] font-medium text-white"
            >
              Close
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-auto bg-[#0F0F0F] p-4">
          <div className="flex min-h-full min-w-full items-center justify-center">
            <img
              src={src}
              alt=""
              className="origin-center rounded-[6px] bg-white shadow-[0_12px_48px_rgba(0,0,0,0.35)]"
              style={{
                maxWidth: zoom === 1 ? "100%" : "none",
                maxHeight: zoom === 1 ? "100%" : "none",
                width: zoom === 1 ? "auto" : `${zoom * 100}%`,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
