import { useSyncExternalStore } from "react";
import {
  readStageWidgetVisibility,
  subscribeStageWidgetVisibility,
  writeStageWidgetVisibility,
} from "@/lib/companion/widgetVisibility";

export function useStageWidgetVisibility() {
  const enabled = useSyncExternalStore(
    subscribeStageWidgetVisibility,
    readStageWidgetVisibility,
    () => true,
  );

  return {
    enabled,
    setEnabled: writeStageWidgetVisibility,
  };
}
