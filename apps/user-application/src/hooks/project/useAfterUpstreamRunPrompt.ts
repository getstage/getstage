import { useCallback, useEffect, useRef, useState } from "react";
import type { UpstreamStaleKind } from "@/lib/project/upstreamStaleFlag";
import { markUpstreamStale } from "@/lib/project/upstreamStaleFlag";
import { useClearDownstreamArtifacts } from "./useClearDownstreamArtifacts";

type PendingUpstreamRun = {
  kind: UpstreamStaleKind;
  hadDownstream: boolean;
};

export function useAfterUpstreamRunPrompt(projectId: string) {
  const clearDownstream = useClearDownstreamArtifacts(projectId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [upstreamKind, setUpstreamKind] = useState<UpstreamStaleKind>("research");
  const [clearError, setClearError] = useState<string | null>(null);
  const pendingRef = useRef<PendingUpstreamRun | null>(null);
  const wasActiveRef = useRef(false);

  const beginPending = useCallback((kind: UpstreamStaleKind, options: { hadDownstream: boolean }) => {
    pendingRef.current = { kind, hadDownstream: options.hadDownstream };
  }, []);

  const trackRunActivity = useCallback(
    (isActive: boolean, runError: string | null) => {
      if (isActive) {
        wasActiveRef.current = true;
        return;
      }

      if (!wasActiveRef.current) {
        return;
      }

      wasActiveRef.current = false;
      const pending = pendingRef.current;
      pendingRef.current = null;

      if (!pending || runError) {
        return;
      }

      if (!pending.hadDownstream) {
        markUpstreamStale(projectId, pending.kind);
        return;
      }

      setUpstreamKind(pending.kind);
      setClearError(null);
      setDialogOpen(true);
    },
    [projectId],
  );

  useEffect(() => {
    return () => {
      pendingRef.current = null;
      wasActiveRef.current = false;
    };
  }, [projectId]);

  const keepDownstream = useCallback(() => {
    markUpstreamStale(projectId, upstreamKind);
    setDialogOpen(false);
  }, [projectId, upstreamKind]);

  const clearDownstreamWork = useCallback(async () => {
    setClearError(null);
    try {
      await clearDownstream.mutateAsync();
      setDialogOpen(false);
    } catch (error) {
      setClearError(error instanceof Error ? error.message : "Could not clear later steps.");
    }
  }, [clearDownstream]);

  return {
    dialogOpen,
    setDialogOpen,
    upstreamKind,
    beginPending,
    trackRunActivity,
    keepDownstream,
    clearDownstreamWork,
    isClearing: clearDownstream.isPending,
    clearError,
  };
}
