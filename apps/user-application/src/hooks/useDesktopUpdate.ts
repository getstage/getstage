import { useCallback, useEffect, useState } from "react";
import type { DesktopUpdateStatus } from "@shared/models/desktop";
import { useDesktopBridge } from "@/hooks/useDesktopBridge";

export function useDesktopUpdate() {
  const desktop = useDesktopBridge();
  const [status, setStatus] = useState<DesktopUpdateStatus | null>(null);

  useEffect(() => {
    if (!desktop?.updates) {
      return;
    }

    let active = true;

    void desktop.updates.getStatus().then((nextStatus) => {
      if (active) {
        setStatus(nextStatus);
      }
    });

    const unsubscribe = desktop.updates.onStatusChanged((nextStatus) => {
      setStatus(nextStatus);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [desktop]);

  const checkForUpdates = useCallback(async () => {
    if (!desktop?.updates) {
      return null;
    }

    const nextStatus = await desktop.updates.check();
    setStatus(nextStatus);
    return nextStatus;
  }, [desktop]);

  const installUpdate = useCallback(async () => {
    if (!desktop?.updates) {
      return null;
    }

    const nextStatus = await desktop.updates.install();
    setStatus(nextStatus);
    return nextStatus;
  }, [desktop]);

  return {
    status,
    isDesktop: Boolean(desktop?.updates),
    checkForUpdates,
    installUpdate,
  };
}
