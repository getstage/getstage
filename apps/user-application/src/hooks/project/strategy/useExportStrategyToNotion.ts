import { useCallback, useState } from "react";
import { useAction as useConvexAction, useConvexAuth, useQuery as useConvexQuery } from "convex/react";
import type { Id } from "@stage/data-ops/convex/data-model";
import { api } from "@/lib/convexApi";
import { openExternalLink } from "@/lib/settings/openExternalLink";

const NOTION_PARENT_REQUIRED = "NOTION_PARENT_REQUIRED";

export function useExportStrategyToNotion(artifactId: string | null) {
  const { isAuthenticated } = useConvexAuth();
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [needsParentPage, setNeedsParentPage] = useState(false);

  const nativeConnectionStatus = useConvexQuery(
    api.integrations.contentPlatforms.getNativeConnectionStatus,
    isAuthenticated ? {} : "skip",
  );
  const exportStrategy = useConvexAction(
    api.integrations.contentPlatforms.exportStrategyArtifactToNotion,
  );

  const notionConnection = nativeConnectionStatus?.notion ?? null;
  const isNotionConnected = notionConnection?.status === "active";
  const hasStoredParent = Boolean(notionConnection?.defaultParentPageId);

  const exportToNotion = useCallback(
    async (parentPageUrlOrId?: string) => {
      if (!artifactId) {
        setExportError("Strategy artifact is not ready to export.");
        return;
      }

      if (!isNotionConnected) {
        setExportError("Connect Notion in Settings before exporting.");
        return;
      }

      if (!parentPageUrlOrId?.trim() && !hasStoredParent) {
        setNeedsParentPage(true);
        setExportError(null);
        return;
      }

      setIsExporting(true);
      setExportError(null);

      try {
        const result = await exportStrategy({
          artifactId: artifactId as Id<"projectAiArtifacts">,
          parentPageUrlOrId: parentPageUrlOrId?.trim() || undefined,
        });
        setNeedsParentPage(false);
        await openExternalLink(result.destinationUrl);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Could not export strategy to Notion.";
        if (message === NOTION_PARENT_REQUIRED) {
          setNeedsParentPage(true);
          setExportError(null);
          return;
        }
        setExportError(message);
      } finally {
        setIsExporting(false);
      }
    },
    [artifactId, exportStrategy, hasStoredParent, isNotionConnected],
  );

  function dismissParentPagePrompt() {
    setNeedsParentPage(false);
  }

  return {
    exportToNotion,
    isExporting,
    exportError,
    setExportError,
    needsParentPage,
    dismissParentPagePrompt,
    isNotionConnected,
    hasStoredParent,
    defaultParentPageUrl: notionConnection?.defaultParentPageUrl ?? null,
  };
}
