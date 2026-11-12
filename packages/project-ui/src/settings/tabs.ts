import type { SettingsTab } from "@stage/project-ui/settings/model";

export const SETTINGS_TABS: Array<{ key: SettingsTab; label: string; icon: string }> = [
  { key: "profile", label: "Profile", icon: "profile" },
  { key: "team", label: "Teams", icon: "team" },
  { key: "billing", label: "Billing & Credits", icon: "billing" },
  { key: "clients", label: "Clients", icon: "clients" },
  { key: "shortcuts", label: "Shortcuts", icon: "shortcuts" },
  { key: "account", label: "Account", icon: "account" },
];

export const SETTINGS_TAB_ICON_PATHS: Record<string, string> = {
  profile: "/logos/dashboard/profile.svg",
  billing: "/logos/dashboard/billing.svg",
  team: "/logos/dashboard/assign.svg",
  clients: "/logos/dashboard/clients.svg",
  developer: "/logos/dashboard/developer.svg",
  shortcuts: "/logos/dashboard/ai-generated.svg",
  account: "/logos/dashboard/account.svg",
};
