// Shared between the renderer preview and Electron Hi-Fi Figma export capture.
export const WIREFRAME_DESIGN_WIDTH = 1440;

export function buildWireframePreviewDocument(fragment: string): string {
  return `<!doctype html><html><head><meta charset="utf-8" /><style>
    *,*::before,*::after{box-sizing:border-box;}
    html,body{margin:0;padding:0;}
    body{font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#171717;background:#ffffff;}
    img{max-width:100%;}
  </style></head><body>${fragment}</body></html>`;
}
