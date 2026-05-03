import { useCallback, useEffect, useState } from "react";
import type { SettingsTab } from "@/types/settings";

function getTabFromUrl(): SettingsTab {
  const tabParam = new URLSearchParams(window.location.search).get("tab");
  if (tabParam === "billing" || tabParam === "integrations" || tabParam === "portal" || tabParam === "developer" || tabParam === "clients" || tabParam === "account") {
    return tabParam;
  }
  return "general";
}

export function useSettingsTabs() {
  const [activeTab, setActiveTabState] = useState<SettingsTab>(() => getTabFromUrl());

  useEffect(() => {
    const applyTabFromUrl = () => {
      setActiveTabState(getTabFromUrl());
    };

    applyTabFromUrl();
    window.addEventListener("popstate", applyTabFromUrl);
    return () => window.removeEventListener("popstate", applyTabFromUrl);
  }, []);

  const setActiveTab = useCallback((tab: SettingsTab) => {
    setActiveTabState(tab);
    const url = new URL(window.location.href);
    if (tab === "general") {
      url.searchParams.delete("tab");
    } else {
      url.searchParams.set("tab", tab);
    }
    window.history.pushState({}, "", url.toString());
  }, []);

  return {
    activeTab,
    setActiveTab,
    openBillingTab: () => setActiveTab("billing"),
  };
}
