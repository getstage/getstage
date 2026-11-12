import type { NavigateOptions } from "@tanstack/react-router";
import type { SettingsTab } from "@stage/project-ui/settings/model";

export { SETTINGS_TABS, SETTINGS_TAB_ICON_PATHS } from "@stage/project-ui/settings/tabs";

// Mac routes for each Settings tab.
export function getSettingsTabRoute(tab: SettingsTab): NavigateOptions["to"] {
  switch (tab) {
    case "integrations":
      return "/integrations";
    case "profile":
      return "/settings";
    case "billing":
      return "/settings/billing";
    case "team":
      return "/settings/team";
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
