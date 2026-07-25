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

export function buildWireframePreviewDocument(fragment: string): string {
  return `<!doctype html><html><head><meta charset="utf-8" /><style>
    *,*::before,*::after{box-sizing:border-box;}
    ${WIREFRAME_PREVIEW_COLLAPSE_CSS}
  </style></head><body>${fragment}</body></html>`;
}
