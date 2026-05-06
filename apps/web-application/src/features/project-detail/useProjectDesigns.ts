import { useState, useCallback } from "react";

/**
 * Design connection and preview types for the Stitch panel.
 * These match the shapes the backend API returns.
 */
export type DesignConnection = {
  id: string;
  provider: string;
  stitchProjectUrl: string;
  title: string | null;
  status: "active" | "error" | "archived";
  lastSyncedAt: string | null;
};

export type DesignPreview = {
  id: string;
  title: string | null;
  thumbnailUrl: string | null;
  phaseId: string | null;
  phaseName: string | null;
  syncedAt: string;
  sortOrder: number;
};

export type StitchPanelState =
  | "empty"
  | "linked"
  | "synced"
  | "syncing"
  | "error";

type UseProjectDesignsReturn = {
  state: StitchPanelState;
  connection: DesignConnection | null;
  previews: DesignPreview[];
  error: string | null;
  isLinking: boolean;
  isSyncing: boolean;
  linkStitchProject: (url: string, title?: string) => Promise<void>;
  syncLatest: () => Promise<void>;
  unlinkStitchProject: () => Promise<void>;
};

/**
 * Hook for the project-level Stitch panel.
 *
 * Currently uses mock data so the UI can be built and reviewed
 * before the backend exposes authenticated Convex queries.
 *
 * To wire up for real:
 * 1. Replace mock state with Convex useQuery calls:
 *    - query for design connections (by projectId)
 *    - query for synced designs (by projectId)
 * 2. Replace mock mutations with Convex useMutation calls:
 *    - mutation to upsert design connection
 *    - mutation to trigger sync
 *    - mutation to remove connection
 */
export function useProjectDesigns(_projectId: string): UseProjectDesignsReturn {
  const [connection, setConnection] = useState<DesignConnection | null>(null);
  const [previews, setPreviews] = useState<DesignPreview[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLinking, setIsLinking] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const state: StitchPanelState = (() => {
    if (isSyncing) return "syncing";
    if (error) return "error";
    if (!connection) return "empty";
    if (previews.length > 0) return "synced";
    return "linked";
  })();

  const linkStitchProject = useCallback(
    async (url: string, title?: string) => {
      setIsLinking(true);
      setError(null);
      try {
        // TODO: Replace with Convex mutation
        await new Promise((resolve) => setTimeout(resolve, 600));
        setConnection({
          id: "mock-connection",
          provider: "stitch",
          stitchProjectUrl: url,
          title: title || null,
          status: "active",
          lastSyncedAt: null,
        });
      } catch {
        setError("Failed to link Stitch project. Please try again.");
      } finally {
        setIsLinking(false);
      }
    },
    [],
  );

  const syncLatest = useCallback(async () => {
    setIsSyncing(true);
    setError(null);
    try {
      // TODO: Replace with Convex mutation
      await new Promise((resolve) => setTimeout(resolve, 1200));
      const now = new Date().toISOString();
      setPreviews([
        {
          id: "preview-1",
          title: "Homepage",
          thumbnailUrl: null,
          phaseId: null,
          phaseName: null,
          syncedAt: now,
          sortOrder: 0,
        },
        {
          id: "preview-2",
          title: "About page",
          thumbnailUrl: null,
          phaseId: null,
          phaseName: null,
          syncedAt: now,
          sortOrder: 1,
        },
        {
          id: "preview-3",
          title: "Contact",
          thumbnailUrl: null,
          phaseId: null,
          phaseName: null,
          syncedAt: now,
          sortOrder: 2,
        },
      ]);
      setConnection((prev) =>
        prev ? { ...prev, lastSyncedAt: now } : prev,
      );
    } catch {
      setError("Sync failed. Please try again.");
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const unlinkStitchProject = useCallback(async () => {
    // TODO: Replace with Convex mutation
    setConnection(null);
    setPreviews([]);
    setError(null);
  }, []);

  return {
    state,
    connection,
    previews,
    error,
    isLinking,
    isSyncing,
    linkStitchProject,
    syncLatest,
    unlinkStitchProject,
  };
}
