export type SidebarNavItem = { name: string; icon: string; routeKey: string };

export function sidebarLabelClassName(collapsed: boolean) {
  return collapsed
    ? "hidden"
    : "min-w-0 max-w-[150px] overflow-hidden truncate whitespace-nowrap text-[13px] font-medium";
}
