import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation } from "convex/react";
import type { ProjectDetail } from "@stage/data-ops";
import { parseConvexId } from "@stage/data-ops";
import { api } from "@/lib/convexApi";
import { toUserFacingErrorMessage } from "@/lib/errors";
import { resolvePortalShareUrl } from "@/lib/portal";

type UseProjectShareLinkInput = {
  projectId: string | undefined;
  detail: ProjectDetail | null;
  open: boolean;
};

export function useProjectShareLink({ projectId, detail, open }: UseProjectShareLinkInput) {
  const copyTimeoutRef = useRef<number | undefined>(undefined);
  const ensureShareLink = useMutation(api.portal.ensureShareLink);
  const [shareUrl, setShareUrl] = useState("");
  const [isPreparing, setIsPreparing] = useState(false);
  const [prepareError, setPrepareError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const convexProjectId = parseConvexId<"projects">(projectId);

  const fallbackShareUrl = useMemo(
    () =>
      resolvePortalShareUrl({
        shareToken: detail?.shareToken,
        shareUrl: detail?.shareUrl,
      }),
    [detail?.shareToken, detail?.shareUrl],
  );

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current !== undefined) {
        window.clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!open) {
      setCopied(false);
      setPrepareError(null);
      setIsPreparing(false);
      setShareUrl(fallbackShareUrl);
      return;
    }

    if (!convexProjectId) {
      setShareUrl("");
      return;
    }

    let cancelled = false;
    setIsPreparing(true);
    setPrepareError(null);

    void ensureShareLink({ projectId: convexProjectId })
      .then((result) => {
        if (cancelled) return;
        setShareUrl(resolvePortalShareUrl(result));
      })
      .catch((error) => {
        if (cancelled) return;
        setPrepareError(
          toUserFacingErrorMessage(error, "Could not prepare the client portal link."),
        );
        setShareUrl(fallbackShareUrl);
      })
      .finally(() => {
        if (!cancelled) {
          setIsPreparing(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open, convexProjectId, ensureShareLink, fallbackShareUrl]);

  async function copyShareUrl() {
    if (!shareUrl) return;

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
      setPrepareError(toUserFacingErrorMessage(error, "Could not copy the share link."));
    }
  }

  return {
    shareUrl,
    copied,
    isPreparing,
    prepareError,
    copyShareUrl,
  };
}
