import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useRef, useState } from "react";
import {
  buildWireframePreviewDocument,
  WIREFRAME_DESIGN_WIDTH,
} from "@shared/wireframePreviewDocument";

const DESIGN_WIDTH = WIREFRAME_DESIGN_WIDTH;

export { buildWireframePreviewDocument };

// A non-interactive, scaled-down render of the design used as a card thumbnail.
// `sandbox=""` is the maximally locked posture: no scripts, no forms, no
// same-origin access — only the static markup and images render.
export function WireframeHtmlThumbnail({ html }: { html: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  // The iframe is sized to fill the card's preview band exactly (width-scaled,
  // top-aligned) rather than a fixed tall viewport, so a design that is shorter
  // than an arbitrary max no longer leaves a big white gap below it. Anything
  // taller than the band is cropped by the container's `overflow-hidden`.
  const [{ scale, designHeight }, setBox] = useState({ scale: 0.2, designHeight: DESIGN_WIDTH });
  // Lazy-mount the iframe only when the card scrolls near the viewport. A 1440×2400
  // iframe document is a full layout allocation per card; a results grid of 6–12
  // cards would otherwise reserve ~12 fully-loaded docs simultaneously, pressuring
  // memory on lower-end devices. `rootMargin` preloads a little before entry so the
  // thumbnail is ready by the time it's visible.
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const element = containerRef.current;
    if (!element || inView) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [inView]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      const width = rect?.width ?? 0;
      const height = rect?.height ?? 0;
      if (width <= 0 || height <= 0) return;
      const nextScale = width / DESIGN_WIDTH;
      // Design-space height that exactly fills the band; the iframe never extends
      // past it, so there is no white area below the design.
      setBox({ scale: nextScale, designHeight: height / nextScale });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="h-full w-full overflow-hidden rounded-[3px] bg-white">
      {inView ? (
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
            height: designHeight,
            transform: `scale(${scale})`,
          }}
        />
      ) : null}
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
