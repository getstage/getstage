import { useCallback, useState } from "react";
import { useAction as useConvexAction, useConvexAuth, useQuery as useConvexQuery } from "convex/react";
import { api } from "@/lib/convexApi";
import { clearDesktopSessionIfExpired, toUserFacingErrorMessage } from "@/lib/errors";
import { openExternalLink } from "@/lib/settings/openExternalLink";
import type { Id } from "@stage/data-ops/convex/data-model";

const NOTION_PARENT_REQUIRED = "NOTION_PARENT_REQUIRED";

export function useExportResearchToNotion(artifactId: string | null) {
  const { isAuthenticated } = useConvexAuth();
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [needsParentPage, setNeedsParentPage] = useState(false);

  const nativeConnectionStatus = useConvexQuery(
    api.integrations.contentPlatforms.getNativeConnectionStatus,
    isAuthenticated ? {} : "skip",
  );
  const exportResearch = useConvexAction(
    api.integrations.contentPlatforms.exportResearchArtifactToNotion,
  );

  const notionConnection = nativeConnectionStatus?.notion ?? null;
  const isNotionConnected = notionConnection?.status === "active";
  const hasStoredParent = Boolean(notionConnection?.defaultParentPageId);

  const exportToNotion = useCallback(
    async (parentPageUrlOrId?: string) => {
      if (!artifactId) {
        setExportError("Research artifact is not ready to export.");
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
        const result = await exportResearch({
          artifactId: artifactId as Id<"projectAiArtifacts">,
          parentPageUrlOrId: parentPageUrlOrId?.trim() || undefined,
        });
        setNeedsParentPage(false);
        await openExternalLink(result.destinationUrl);
      } catch (error) {
        await clearDesktopSessionIfExpired(error);
        const message = toUserFacingErrorMessage(
          error,
          "Could not export research to Notion.",
        );
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
    [artifactId, exportResearch, hasStoredParent, isNotionConnected],
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
