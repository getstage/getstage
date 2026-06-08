import { useCallback, useRef, useState } from "react";
import { useQuery } from "convex/react";
import type { CreateFigmaExportResponse } from "@stage/data-ops/contracts";
import type { Id } from "@stage/data-ops/convex/data-model";
import { api } from "@/lib/convexApi";

export function useFlowsFigJamExport(projectId: string) {
  const [request, setRequest] = useState<CreateFigmaExportResponse | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlightRef = useRef<Promise<CreateFigmaExportResponse> | null>(null);
  const job = useQuery(
    api.integrations.contentPlatforms.getFigmaExportJob,
    request ? { jobId: request.jobId as Id<"figmaExportJobs"> } : "skip",
  );

  const sendToFigJam = useCallback(
    async (artifactId: string) => {
      if (inFlightRef.current) return inFlightRef.current;

      setIsExporting(true);
      setError(null);
      const exportPromise = window.stageDesktop.engine.createFigJamExport({
        projectId,
        artifactId,
      });
      inFlightRef.current = exportPromise;

      try {
        const response = await exportPromise;
        setRequest(response);
        return response;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Could not send flows to FigJam.";
        setError(message);
        throw err;
      } finally {
        if (inFlightRef.current === exportPromise) inFlightRef.current = null;
        setIsExporting(false);
      }
    },
    [projectId],
  );

  return {
    sendToFigJam,
    isExporting,
    request,
    job,
    error,
    clearResult: () => {
      setRequest(null);
      setError(null);
    },
  };
}
