import { useCallback, useRef, useState } from "react";
import { useQuery } from "convex/react";
import type { CreateFigmaExportResponse } from "@stage/data-ops/contracts";
import type { Id } from "@stage/data-ops/convex/data-model";
import { api } from "@/lib/convexApi";
import { toUserFacingErrorMessage } from "@/lib/errors";
import type { WireframeAssetCard } from "@/types/project/assetsTab";

export function useFigmaWireframeExport(projectId: string) {
  const [request, setRequest] = useState<CreateFigmaExportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const inFlightRef = useRef<Promise<CreateFigmaExportResponse> | null>(null);
  const job = useQuery(
    api.integrations.contentPlatforms.getFigmaExportJob,
    request ? { jobId: request.jobId as Id<"figmaExportJobs"> } : "skip",
  );

  const startExport = useCallback(
    async (asset: WireframeAssetCard) => {
      if (inFlightRef.current) {
        return inFlightRef.current;
      }

      setIsExporting(true);
      setError(null);
      const promise = window.stageDesktop.engine.createFigmaExport({
        projectId,
        artifactId: asset.artifactId,
        screenId: asset.screenId,
      });
      inFlightRef.current = promise;

      try {
        const result = await promise;
        setRequest(result);
        return result;
      } catch (exportError) {
        setError(toUserFacingErrorMessage(exportError, "Could not start Figma export."));
        throw exportError;
      } finally {
        if (inFlightRef.current === promise) {
          inFlightRef.current = null;
        }
        setIsExporting(false);
      }
    },
    [projectId],
  );

  return {
    startExport,
    request,
    job,
    error,
    isExporting,
    reset: () => {
      setRequest(null);
      setError(null);
    },
  };
}
