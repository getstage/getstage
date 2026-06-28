import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useRef, useState } from "react";

// The width the generated design is authored for. Thumbnails render at this
// width and scale down to fit their container so type stays legible.
const DESIGN_WIDTH = 1280;
// A tall-enough viewport to show the top of any screen in the thumbnail; the
// container clips the overflow.
const THUMBNAIL_HEIGHT = 2400;

// Wraps a model-generated HTML fragment into a standalone document. The fragment
// carries its own <style>; we only add a minimal reset and a safe font fallback.
export function buildWireframePreviewDocument(fragment: string): string {
  return `<!doctype html><html><head><meta charset="utf-8" /><style>
    *,*::before,*::after{box-sizing:border-box;}
    html,body{margin:0;padding:0;}
    body{font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#171717;background:#ffffff;}
    img{max-width:100%;}
  </style></head><body>${fragment}</body></html>`;
}

// A non-interactive, scaled-down render of the design used as a card thumbnail.
// `sandbox=""` is the maximally locked posture: no scripts, no forms, no
// same-origin access — only the static markup and images render.
export function WireframeHtmlThumbnail({ html }: { html: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.2);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      if (width > 0) setScale(width / DESIGN_WIDTH);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="h-full w-full overflow-hidden rounded-[3px] bg-white">
      <iframe
        title="Wireframe preview"
        srcDoc={buildWireframePreviewDocument(html)}
        sandbox=""
        scrolling="no"
        tabIndex={-1}
        aria-hidden
        className="pointer-events-none origin-top-left border-0"
        style={{
          width: DESIGN_WIDTH,
          height: THUMBNAIL_HEIGHT,
          transform: `scale(${scale})`,
        }}
      />
    </div>
  );
}

// Full-size, scrollable render shown when a card is expanded.
export function WireframeHtmlPreviewDialog({
  html,
  title,
  open,
  onOpenChange,
}: {
  html: string;
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[rgba(10,10,10,0.22)]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex h-[calc(100vh-48px)] max-h-[920px] w-[calc(100vw-48px)] max-w-[1280px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[12px] bg-white shadow-[0_8px_32px_rgba(10,10,10,0.25)] outline-none">
          <div className="flex shrink-0 items-center justify-between border-b border-[#E5E5E5] px-4 py-3">
            <Dialog.Title className="text-[15px] font-medium leading-[1.25] text-[#171717]">
              {title}
            </Dialog.Title>
            <Dialog.Close className="inline-flex h-8 cursor-pointer items-center justify-center rounded-[6px] border border-[#D4D4D4] bg-[#F5F5F5] px-3 text-[13px] font-medium leading-none text-[#171717] transition-colors hover:bg-[#EDEDED]">
              Close
            </Dialog.Close>
          </div>
          <iframe
            title={`${title} full preview`}
            srcDoc={buildWireframePreviewDocument(html)}
            sandbox=""
            className="min-h-0 flex-1 border-0 bg-white"
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
