import { useEffect, useMemo, useRef, useState } from "react";
import { toUserFacingErrorMessage } from "@/lib/errors";
import { trackDatafastGoalOnce } from "@/lib/datafast";
import { resolvePortalShareUrl } from "@/lib/portal";
import type { ProjectShareController } from "@/features/project-detail/controllers";
import type { Project } from "@/types";

type ShareLinkInput = {
  project: Project | null | undefined;
  showError: (message: string) => void;
};

export function useShareLink({
  project,
  showError,
}: ShareLinkInput): ProjectShareController {
  const copyTimeoutRef = useRef<number | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const shareUrl = useMemo(
    () =>
      resolvePortalShareUrl({
        shareToken: project?.shareToken,
        shareUrl: project?.shareUrl,
      }),
    [project?.shareToken, project?.shareUrl],
  );

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current !== undefined) {
        window.clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  async function handleCopyShareUrl() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);

      if (copyTimeoutRef.current !== undefined) {
        window.clearTimeout(copyTimeoutRef.current);
      }

      if (project?.id) {
        trackDatafastGoalOnce("portal_shared", `portal_shared:${project.id}`, {
          source: "share_dialog",
          project_id: project.id,
        });
      }

      copyTimeoutRef.current = window.setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      showError(toUserFacingErrorMessage(error, "Could not copy the share link."));
    }
  }

  return {
    open,
    setOpen,
    shareUrl,
    copied,
    handleCopyShareUrl,
  };
}
