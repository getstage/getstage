import { useCallback, useRef, useState } from "react";
import { toUserFacingErrorMessage } from "@/lib/errors";
import type { ExportOption, WireframeAssetCard } from "@/types/project/assetsTab";

export function useWireframeDeliveryExport(projectId: string) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const inFlightRef = useRef<Promise<unknown> | null>(null);

  const startExport = useCallback(
    async (option: Exclude<ExportOption, "figma">, asset: WireframeAssetCard) => {
      if (inFlightRef.current) return inFlightRef.current;

      setIsExporting(true);
      setMessage(null);
      setError(null);
      const request = {
        projectId,
        artifactId: asset.artifactId,
        screenId: asset.screenId,
      };
      const promise = (async () => {
        if (option === "code") {
          const result = await window.stageDesktop.engine.exportWireframeCode(request);
          setMessage(
            result.cancelled
              ? "Code export cancelled."
              : `Exported ${result.fileCount} files to ${result.directoryPath}.`,
          );
          return result;
        }
        const result = await window.stageDesktop.engine.createPaperExport(request);
        setMessage(result.message);
        return result;
      })();
      inFlightRef.current = promise;

      try {
        const result = await promise;
        return result;
      } catch (exportError) {
        const nextError = toUserFacingErrorMessage(
          exportError instanceof Error ? formatDeliveryExportError(exportError.message) : exportError,
          `Could not export to ${option}.`,
        );
        setError(nextError);
        throw exportError;
      } finally {
        if (inFlightRef.current === promise) inFlightRef.current = null;
        setIsExporting(false);
      }
    },
    [projectId],
  );

  return {
    startExport,
    message,
    error,
    isExporting,
    reset: () => {
      setMessage(null);
      setError(null);
    },
  };
}

function formatDeliveryExportError(message: string) {
  const cleaned = message
    .replace(/^Error invoking remote method '[^']+': Error:\s*/, "")
    .replace(/^Stage Engine request failed with \d+:\s*/, "")
    .replace(/^Stage Engine request failed with \d+\.\s*/, "");
  // Paper render/write failures (UnknownVizError, write_html failures, Paper not
  // open) otherwise surface as raw engine text. Map them to one actionable line.
  if (/UnknownVizError/i.test(cleaned) || /Paper .*failed/i.test(cleaned) || /Open Paper Desktop/i.test(cleaned)) {
    return "Paper could not render this design. Try regenerating the screen, then export again.";
  }
  return cleaned;
}
