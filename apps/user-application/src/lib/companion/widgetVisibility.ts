export const STAGE_WIDGET_VISIBILITY_STORAGE_KEY = "stage:allow-widget-everywhere";
export const STAGE_WIDGET_VISIBILITY_EVENT = "stage-widget-visibility-changed";

function publishStageWidgetVisibility(enabled: boolean) {
  window.localStorage.setItem(STAGE_WIDGET_VISIBILITY_STORAGE_KEY, String(enabled));
  window.dispatchEvent(
    new CustomEvent(STAGE_WIDGET_VISIBILITY_EVENT, {
      detail: { enabled },
    }),
  );
}

export function readStageWidgetVisibility() {
  if (typeof window === "undefined") {
    return true;
  }

  return window.localStorage.getItem(STAGE_WIDGET_VISIBILITY_STORAGE_KEY) !== "false";
}

export function writeStageWidgetVisibility(enabled: boolean) {
  publishStageWidgetVisibility(enabled);
  void window.stageDesktop?.companion
    ?.setWidgetSettings({ allowEverywhere: enabled })
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : "Unknown widget settings error.";
      console.warn(`[stage-companion] Could not save widget setting: ${message}`);
    });
}

export async function readStageWidgetVisibilityFromDesktop() {
  const settings = await window.stageDesktop?.companion?.getWidgetSettings?.();
  return settings?.allowEverywhere ?? readStageWidgetVisibility();
}

export function syncStageWidgetVisibilityFromDesktop(enabled: boolean) {
  if (readStageWidgetVisibility() === enabled) {
    return;
  }

  publishStageWidgetVisibility(enabled);
}

export function subscribeStageWidgetVisibility(onStoreChange: () => void) {
  function handleVisibilityChange() {
    onStoreChange();
  }

  function handleStorage(event: StorageEvent) {
    if (event.key === STAGE_WIDGET_VISIBILITY_STORAGE_KEY) {
      onStoreChange();
    }
  }

  window.addEventListener(STAGE_WIDGET_VISIBILITY_EVENT, handleVisibilityChange);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(STAGE_WIDGET_VISIBILITY_EVENT, handleVisibilityChange);
    window.removeEventListener("storage", handleStorage);
  };
}
