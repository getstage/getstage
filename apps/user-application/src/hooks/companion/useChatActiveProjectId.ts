import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";
import { getActiveProjectId } from "@/lib/dashboard/sidebarNav";

const COMPANION_PROJECT_ID_KEY = "stage.companion.activeProjectId";

function isCompanionWindow() {
  return new URLSearchParams(window.location.search).get("stageWindow") === "companion";
}

function readStoredProjectId() {
  return sessionStorage.getItem(COMPANION_PROJECT_ID_KEY)?.trim() ?? "";
}

/**
 * Resolves project context for desktop chat runs.
 * Main window: from the current `/project/:id` route.
 * Companion window: from sessionStorage (synced by the main window on navigation).
 */
export function useChatActiveProjectId() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const routeProjectId = getActiveProjectId(pathname);
  const inCompanionWindow = isCompanionWindow();

  useEffect(() => {
    if (inCompanionWindow) {
      return;
    }

    if (routeProjectId) {
      sessionStorage.setItem(COMPANION_PROJECT_ID_KEY, routeProjectId);
      return;
    }

    sessionStorage.removeItem(COMPANION_PROJECT_ID_KEY);
  }, [inCompanionWindow, routeProjectId]);

  if (routeProjectId) {
    return routeProjectId;
  }

  return inCompanionWindow ? readStoredProjectId() : "";
}
