import type { NavigateOptions } from "@tanstack/react-router";
import type { SettingsTab } from "@/models/settings/settings";

export const SETTINGS_TABS: Array<{ key: SettingsTab; label: string; icon: string }> = [
  { key: "profile", label: "Profile", icon: "profile" },
  { key: "billing", label: "Billing & Credits", icon: "billing" },
  { key: "clients", label: "Clients", icon: "clients" },
  { key: "shortcuts", label: "Shortcuts", icon: "shortcuts" },
  { key: "account", label: "Account", icon: "account" },
];

export const SETTINGS_TAB_ICON_PATHS: Record<string, string> = {
  profile: "/logos/dashboard/profile.svg",
  billing: "/logos/dashboard/billing.svg",
  clients: "/logos/dashboard/clients.svg",
  developer: "/logos/dashboard/developer.svg",
  shortcuts: "/logos/dashboard/ai-generated.svg",
  account: "/logos/dashboard/account.svg",
};

export function getSettingsTabRoute(tab: SettingsTab): NavigateOptions["to"] {
  switch (tab) {
    case "integrations":
      return "/integrations";
    case "profile":
      return "/settings";
    case "billing":
      return "/settings/billing";
    case "clients":
      return "/settings/clients";
    case "developer":
      return "/settings/developer";
    case "shortcuts":
      return "/settings/shortcuts";
    case "account":
      return "/settings/account";
    case "portal":
      return "/settings/portal";
  }
}
