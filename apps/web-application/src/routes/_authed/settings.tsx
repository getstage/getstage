import { createFileRoute } from "@tanstack/react-router";
import { SettingsPage } from "@/components/settings/SettingsPage";
import type { SettingsTab } from "@/types/settings";

const SETTINGS_TABS = new Set<SettingsTab>([
  "general",
  "billing",
  "integrations",
  "portal",
  "developer",
  "clients",
  "account",
]);

export const Route = createFileRoute("/_authed/settings")({
  validateSearch: (search: Record<string, unknown>): { tab?: SettingsTab } => {
    const tab = search.tab;
    return typeof tab === "string" && SETTINGS_TABS.has(tab as SettingsTab)
      ? { tab: tab as SettingsTab }
      : {};
  },
  component: SettingsPage,
});
