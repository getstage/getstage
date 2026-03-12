import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation as useConvexMutation } from "convex/react";
import { api } from "@/lib/convex";
import { toUserFacingErrorMessage } from "@/lib/errors";
import { resolvePortalShareUrl } from "@/lib/portal";
import type { ProjectShareController } from "@/features/project-detail/controllers";
import type { Project } from "@/types";
import type { Id } from "../../../convex/_generated/dataModel";

type ShareLinkInput = {
  project: Project | null | undefined;
  projectId: Id<"projects">;
  showError: (message: string) => void;
};

export function useShareLink({
  project,
  projectId,
  showError,
}: ShareLinkInput): ProjectShareController {
  const setPortalEnabled = useConvexMutation(api.portal.setEnabled);
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
  const clientAccess = project?.portalEnabled ?? true;

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current !== undefined) {
        window.clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  async function handleTogglePortalEnabled() {
    try {
      await setPortalEnabled({
        projectId,
        isEnabled: !clientAccess,
      });
    } catch (error) {
      showError(toUserFacingErrorMessage(error, "Could not update client access."));
    }
  }

  async function handleCopyShareUrl() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);

      if (copyTimeoutRef.current !== undefined) {
        window.clearTimeout(copyTimeoutRef.current);
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
    clientAccess,
    copied,
    handleTogglePortalEnabled,
    handleCopyShareUrl,
  };
}
