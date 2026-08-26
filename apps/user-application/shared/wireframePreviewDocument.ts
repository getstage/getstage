// Shared between the renderer preview and Electron Hi-Fi Figma export capture.
export const WIREFRAME_DESIGN_WIDTH = 1440;

/**
 * CSS that collapses viewport-tall empty canvases (min-height: 100vh + flex
 * centering). Without this, modal/onboarding screens render as a tiny card in
 * a huge white frame — both in Stage thumbnails and in Figma exports.
 */
export const WIREFRAME_PREVIEW_COLLAPSE_CSS = `
  html, body {
    margin: 0 !important;
    padding: 0 !important;
    height: auto !important;
    min-height: 0 !important;
    max-height: none !important;
  }
  body {
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    color: #171717;
    background: #ffffff;
  }
  img { max-width: 100%; }
  /* Outer + one nested shell (e.g. .np > .shell). Models often set
     min-height:760px/100vh on BOTH — collapsing only body > * left a tall
     empty band under the real content in thumbnails and Figma capture. */
  body > div,
  body > main,
  body > section,
  body > div > div,
  body > div > main,
  body > div > section {
    min-height: 0 !important;
    height: auto !important;
    max-height: none !important;
  }
`;

// Fragments from older runs (and the occasional rule-breaking model) still carry
// <script> tags. The preview iframe sandbox blocks them — one console error per tag,
// and the script never runs — so strip them here, covering thumbnails, the full-size
// dialog, and Figma export capture in one place. The `$` alternative also removes an
// unclosed trailing tag, which would otherwise swallow the rest of the fragment.
export function stripScriptTags(fragment: string): string {
  return fragment.replace(/<script\b[\s\S]*?(?:<\/script\s*>|$)/gi, "");
}

export function buildWireframePreviewDocument(
  fragment: string,
  options?: { css?: string | null },
): string {
  // React-rendered runs offload the shared stylesheet to R2; the caller resolves
  // it back to text so this document stays self-contained (sandboxed iframes and
  // the offscreen export capture cannot fetch it themselves). Inlined at the body
  // start, exactly where the renderer used to embed it before the offload.
  const bundle = options?.css?.trim() ? `<style data-stage-render>${options.css}</style>` : "";
  const document = `<!doctype html><html><head><meta charset="utf-8" /><style>
    *,*::before,*::after{box-sizing:border-box;}
    ${WIREFRAME_PREVIEW_COLLAPSE_CSS}
  </style></head><body>${bundle}${fragment}</body></html>`;
  // Sanitize the final document, not only the HTML fragment. This also covers a
  // malformed or edge-mutated stylesheet that closes its style tag and injects a
  // script before the static iframe applies its no-scripts sandbox.
  return stripScriptTags(document);
}
