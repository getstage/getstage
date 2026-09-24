import { useCallback, useRef, useState } from "react";
import { useQuery } from "convex/react";
import type { CreateFigmaExportResponse } from "@stage/data-ops/contracts";
import type { Id } from "@stage/data-ops/convex/data-model";
import { api } from "@/lib/convexApi";
import { toUserFacingErrorMessage } from "@/lib/errors";

export function useFlowsFigJamExport(projectId: string) {
  const [request, setRequest] = useState<CreateFigmaExportResponse | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlightRef = useRef<Promise<CreateFigmaExportResponse> | null>(null);
  const nativeConnections = useQuery(
    api.integrations.contentPlatforms.getNativeConnectionStatus,
    {},
  );
  const job = useQuery(
    api.integrations.contentPlatforms.getFigmaExportJob,
    request ? { jobId: request.jobId as Id<"figmaExportJobs"> } : "skip",
  );

  const sendToFigJam = useCallback(
    async (artifactId: string) => {
      if (inFlightRef.current) return inFlightRef.current;
      if (nativeConnections === undefined) {
        setError("Checking your Figma connection. Try again in a moment.");
        return;
      }
      if (nativeConnections.figma?.status !== "active") {
        setError("Connect Figma in Settings → Integrations before exporting to FigJam.");
        return;
      }

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
        console.error("[FigJam export] failed:", err);
        setError(toUserFacingErrorMessage(err, "Could not send flows to FigJam. Please try again."));
        return undefined;
      } finally {
        if (inFlightRef.current === exportPromise) inFlightRef.current = null;
        setIsExporting(false);
      }
    },
    [nativeConnections, projectId],
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
