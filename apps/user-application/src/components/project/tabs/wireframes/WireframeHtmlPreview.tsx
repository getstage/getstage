import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useRef, useState } from "react";
import {
  buildWireframePreviewDocument,
  WIREFRAME_DESIGN_WIDTH,
} from "@shared/wireframePreviewDocument";

const DESIGN_WIDTH = WIREFRAME_DESIGN_WIDTH;
const DESIGN_HEIGHT = 900;

export { buildWireframePreviewDocument };

// A non-interactive, scaled-down render of the design used as a card thumbnail.
// `sandbox="allow-same-origin"` lets us measure content height (no scripts).
export function WireframeHtmlThumbnail({ html, css = null }: { html: string; css?: string | null }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.2);
  const [docHeight, setDocHeight] = useState(DESIGN_HEIGHT);
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
      if (width <= 0 || height <= 0 || docHeight <= 0) return;
      // Cover the card slot: fill width and height, crop overflow. Avoids the
      // white band under short pages when the iframe was taller than content.
      setScale(Math.max(width / DESIGN_WIDTH, height / docHeight));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [docHeight]);

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden rounded-[3px] bg-white">
      {inView ? (
        <iframe
          key={html.length + html.slice(0, 64)}
          title="Wireframe preview"
          srcDoc={buildWireframePreviewDocument(html, { css })}
          // allow-same-origin: needed to measure contentDocument height.
          // Never add allow-scripts here — that combo would give the framed
          // HTML full same-origin access to the parent app.
          sandbox="allow-same-origin"
          scrolling="no"
          tabIndex={-1}
          aria-hidden
          className="pointer-events-none absolute left-0 top-0 border-0"
          style={{
            width: DESIGN_WIDTH,
            height: docHeight,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
          onLoad={(event) => {
            try {
              const doc = event.currentTarget.contentDocument;
              if (!doc?.body) return;
              // Models often set min-height:760px/100vh on nested shells. CSS
              // collapse misses some; clear tall min-heights then measure.
              for (const el of doc.body.querySelectorAll("*")) {
                const style = doc.defaultView?.getComputedStyle(el);
                if (!style) continue;
                const minH = style.minHeight;
                if (minH.endsWith("vh") || (parseFloat(minH) || 0) >= 480) {
                  (el as HTMLElement).style.minHeight = "0";
                  (el as HTMLElement).style.height = "auto";
                }
              }
              // Measure the body only. `documentElement.scrollHeight` never reports less
              // than the iframe's own viewport, which is this very element at `docHeight`
              // — so including it pinned every screen shorter than the 900px starting
              // height to 900 and rendered the difference as a white band, with no way
              // back down. The collapse CSS gives the body `height: auto`, so it reports
              // the content and nothing else.
              const measured = Math.ceil(
                Math.max(doc.body.scrollHeight, doc.body.getBoundingClientRect().height),
              );
              if (measured > 0) {
                setDocHeight(Math.min(Math.max(measured, 1), 2400));
              }
            } catch {
              // Measurement unavailable — keep DESIGN_HEIGHT fallback.
            }
          }}
        />
      ) : null}
    </div>
  );
}

// Full-size, scrollable render shown when a card is expanded.
export function WireframeHtmlPreviewDialog({
  html,
  css = null,
  title,
  open,
  onOpenChange,
}: {
  html: string;
  css?: string | null;
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[rgba(10,10,10,0.22)]" />
        <Dialog.Content className="fixed bottom-6 left-1/2 top-[72px] z-50 flex w-[calc(100vw-48px)] max-w-[1280px] -translate-x-1/2 flex-col overflow-hidden rounded-[12px] bg-white shadow-[0_8px_32px_rgba(10,10,10,0.25)] outline-none">
          <div className="flex shrink-0 items-center justify-between border-b border-[#E5E5E5] px-4 py-3">
            <Dialog.Title className="text-[15px] font-medium leading-[1.25] text-[#171717]">
              {title}
            </Dialog.Title>
            <Dialog.Description className="sr-only">
              Full-size scrollable preview of the {title} wireframe.
            </Dialog.Description>
            <Dialog.Close className="inline-flex h-8 cursor-pointer items-center justify-center rounded-[6px] border border-[#D4D4D4] bg-[#F5F5F5] px-3 text-[13px] font-medium leading-none text-[#171717] transition-colors hover:bg-[#EDEDED]">
              Close
            </Dialog.Close>
          </div>
          <iframe
            key={html.length + html.slice(0, 64)}
            title={`${title} full preview`}
            srcDoc={buildWireframePreviewDocument(html, { css })}
            sandbox=""
            className="min-h-0 flex-1 border-0 bg-white"
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
