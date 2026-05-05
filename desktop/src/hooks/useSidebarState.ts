import { useState, useEffect } from "react";

const SIDEBAR_COLLAPSED_KEY = "stage_sidebar_collapsed";

export function useSidebarState(defaultValue = false) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    if (saved === null) return defaultValue;
    return saved === "true";
  });

  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(isCollapsed));
  }, [isCollapsed]);

  return [isCollapsed, setIsCollapsed] as const;
}
