import { useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { useDesktopAuth } from "@/lib/auth";
import { api } from "@/lib/convexApi";

// Fires the `app_downloaded` email event once per install. The server mutation
// is idempotent (no-ops if appDownloadedAt is already set), so Strict Mode
// double-invoke and repeated auth-ready transitions are safe. Setting
// appDownloadedAt cancels the pending download-reminder (Flow A email 1b).
export function useRecordAppOpened() {
  const { isAuthenticated, isLoading } = useDesktopAuth();
  const recordAppOpened = useMutation(api.emails.recordAppOpened);
  const firedRef = useRef(false);

  useEffect(() => {
    if (isLoading || !isAuthenticated || firedRef.current) {
      return;
    }
    firedRef.current = true;
    void recordAppOpened({}).catch((error) => {
      console.error("[emails] recordAppOpened failed", error);
    });
  }, [isLoading, isAuthenticated, recordAppOpened]);
}
