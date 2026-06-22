import { useEffect, useSyncExternalStore } from "react";
import {
  readStageWidgetVisibility,
  readStageWidgetVisibilityFromDesktop,
  subscribeStageWidgetVisibility,
  syncStageWidgetVisibilityFromDesktop,
  writeStageWidgetVisibility,
} from "@/lib/companion/widgetVisibility";

export function useStageWidgetVisibility() {
  const enabled = useSyncExternalStore(
    subscribeStageWidgetVisibility,
    readStageWidgetVisibility,
    () => true,
  );

  useEffect(() => {
    let cancelled = false;

    void readStageWidgetVisibilityFromDesktop()
      .then((desktopEnabled) => {
        if (!cancelled) {
          syncStageWidgetVisibilityFromDesktop(desktopEnabled);
        }
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : "Unknown widget settings error.";
        console.warn(`[stage-companion] Could not load widget setting: ${message}`);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    enabled,
    setEnabled: writeStageWidgetVisibility,
  };
}
