export const GITHUB_RELEASES_LATEST = "https://github.com/getstage/getstage/releases/latest";

const GITHUB_REPO = "getstage/getstage";

export type MacCpuArch = "arm64" | "x64";

export function macOsDmgDownloadUrl(arch: MacCpuArch): string {
  const fileName = arch === "arm64" ? "Stage-arm64.dmg" : "Stage-x64.dmg";
  return `https://github.com/${GITHUB_REPO}/releases/latest/download/${fileName}`;
}

/**
 * Best-effort Apple Silicon vs Intel detection in the browser.
 * Falls back to arm64 when uncertain (most new Macs are Apple Silicon).
 */
export function detectMacCpuArch(): MacCpuArch {
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl") ??
      canvas.getContext("experimental-webgl");

    if (gl && "getExtension" in gl) {
      const webgl = gl as WebGLRenderingContext;
      const debugInfo = webgl.getExtension("WEBGL_debug_renderer_info");
      if (debugInfo) {
        const renderer = webgl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        if (typeof renderer === "string") {
          if (/Apple M\d|Apple GPU/i.test(renderer)) {
            return "arm64";
          }
          if (/Intel|AMD|NVIDIA/i.test(renderer)) {
            return "x64";
          }
        }
      }
    }
  } catch {
    // Ignore canvas/WebGL probing failures and use the fallback below.
  }

  return "arm64";
}

export function resolveMacDownloadUrl(preferredArch?: MacCpuArch): string {
  return macOsDmgDownloadUrl(preferredArch ?? detectMacCpuArch());
}
