import type { ProjectCategory } from "@stage/data-ops/contracts";
import { getEnabledProjectTabs, type ProjectTab } from "./tabs";
// Layout of `.project-detail-header` (title, actions, tabs, portal link) for every app that shows a project.
import "./projectHeader.css";

// The project's step tabs (Overview, Research, …). Each app decides what a click does: the Mac app switches
// its tab state, the web app changes the URL.
export function ProjectTabBar({ enabledSteps, category, activeTab, onTabChange }: {
  enabledSteps: readonly string[];
  category?: ProjectCategory;
  activeTab: ProjectTab;
  onTabChange: (tab: ProjectTab) => void;
}) {
  return (
    <div className="project-tab-menu w-fit max-w-full overflow-x-auto rounded-[8px] bg-[#F5F5F5] p-[2px]">
      <div className="flex w-max items-start gap-[8px]">
        {getEnabledProjectTabs(enabledSteps, category).map((tab) => {
          const isActive = tab.key === activeTab;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onTabChange(tab.key)}
              aria-current={isActive ? "page" : undefined}
              className={`inline-flex shrink-0 cursor-pointer items-center gap-[8px] whitespace-nowrap rounded-[6px] py-[6px] pl-[10px] pr-[12px] text-[13px] font-medium leading-none transition-all duration-150 ${
                isActive
                  ? "bg-gradient-to-b from-[#8D87FF] to-[#7B76DF] text-[#E5E5E5] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]"
                  : "text-[#737373] hover:bg-white"
              }`}
            >
              <span
                aria-hidden="true"
                className="h-[15px] w-[15px] shrink-0 bg-current"
                style={{
                  WebkitMask: `url("${tab.iconSrc}") center / contain no-repeat`,
                  mask: `url("${tab.iconSrc}") center / contain no-repeat`,
                }}
              />
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ProjectTitle({ name, clientName, categoryLabel }: { name: string; clientName: string; categoryLabel?: string }) {
  return (
    <div className="project-header-title min-w-0">
      <h1 className="max-w-[720px] truncate font-heading text-[20px] font-semibold leading-[1.2] text-[#0A0A0A]">{name}</h1>
      <div className="project-header-metadata mt-2 flex min-w-0 items-center gap-2 text-[13px] font-medium leading-[1.2] text-[#737373]">
        <span className="truncate">{clientName}</span>
        {categoryLabel ? (
          <>
            <span aria-hidden="true">·</span>
            <span className="shrink-0" aria-label={`Project category: ${categoryLabel}`}>{categoryLabel}</span>
          </>
        ) : null}
      </div>
    </div>
  );
}

// "Client Portal ↗" in the project header. Mac opens its preview route; the web opens the project's public portal.
export function ClientPortalButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-[27px] shrink-0 cursor-pointer items-center gap-2 rounded-[6px] px-[10px] py-[6px] text-[13px] font-medium leading-[1.25] text-[#525252] transition-colors hover:bg-[#F5F5F5]"
    >
      <span className="whitespace-nowrap">Client Portal</span>
      <img src="/logos/dashboard/redirect.svg" alt="" aria-hidden="true" className="h-[15px] w-[15px] shrink-0" />
    </button>
  );
}
