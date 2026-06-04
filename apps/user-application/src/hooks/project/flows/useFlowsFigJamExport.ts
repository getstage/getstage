import { useCallback, useRef, useState } from "react";
import { useMutation } from "convex/react";
import type { Id } from "@stage/data-ops/convex/data-model";
import { api } from "@/lib/convexApi";

type FigJamExportResult = {
  status: "failed" | "completed" | "requested";
  message?: string;
};

export function useFlowsFigJamExport(projectId: string) {
  const exportFlowsToFigJam = useMutation(api.projectAi.exportFlowsToFigJam);
  const [result, setResult] = useState<FigJamExportResult | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlightRef = useRef<Promise<unknown> | null>(null);

  const sendToFigJam = useCallback(
    async (artifactId: string) => {
      if (inFlightRef.current) {
        return inFlightRef.current;
      }

      setIsExporting(true);
      setError(null);
      setResult(null);
      const exportPromise = (async () => {
        const response = await exportFlowsToFigJam({
          projectId: projectId as Id<"projects">,
          artifactId: artifactId as Id<"projectAiArtifacts">,
        });
        setResult({
          status: response.status,
          message: response.message,
        });
        return response;
      })();

      inFlightRef.current = exportPromise;

      try {
        return await exportPromise;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Could not send flows to FigJam.";
        setError(message);
        throw err;
      } finally {
        if (inFlightRef.current === exportPromise) {
          inFlightRef.current = null;
        }
        setIsExporting(false);
      }
    },
    [exportFlowsToFigJam, projectId],
  );

  return {
    sendToFigJam,
    isExporting,
    result,
    error,
    clearResult: () => setResult(null),
  };
}
