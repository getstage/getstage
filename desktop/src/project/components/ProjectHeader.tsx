import type { Project, ProjectTab } from "../models/project";

const PAGE_TABS: { key: ProjectTab; label: string; iconSrc: string }[] = [
  { key: "overview", label: "Overview", iconSrc: "/logos/dashboard/overview.svg" },
  { key: "research", label: "Research", iconSrc: "/logos/dashboard/research.svg" },
  { key: "strategy", label: "Strategy", iconSrc: "/logos/dashboard/strategy.svg" },
  { key: "moodboard", label: "Moodboard", iconSrc: "/logos/dashboard/moodboard.svg" },
  { key: "flows", label: "Flows", iconSrc: "/logos/dashboard/flows.svg" },
  { key: "wireframes", label: "Wireframes", iconSrc: "/logos/dashboard/generate.svg" },
  { key: "assets", label: "Assets", iconSrc: "/logos/dashboard/assets.svg" },
];

export function ProjectHeader({
  project,
  activeTab,
  onTabChange,
  onShare,
}: {
  project: Project;
  activeTab: ProjectTab;
  onTabChange: (tab: ProjectTab) => void;
  onShare: () => void;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <h1 className="max-w-[720px] truncate font-heading text-[20px] font-semibold leading-[1.2] text-[#0A0A0A]">
            {project.name}
          </h1>
          <p className="mt-2 truncate text-[13px] font-medium leading-[1.2] text-[#737373]">
            {project.clientName}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-[6px]">
          <button
            type="button"
            onClick={onShare}
            className="inline-flex h-[27px] cursor-pointer items-center gap-2 rounded-[6px] bg-[#F5F5F5] py-[6px] pl-[10px] pr-3 text-[13px] font-medium leading-[1.25] text-[#262626] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#ECECEC]"
          >
            Share
            <img src="/logos/dashboard/share.svg" alt="" aria-hidden="true" className="h-[15px] w-[15px] shrink-0" />
          </button>

          <button
            type="button"
            className="flex h-[27px] w-[27px] cursor-pointer items-center justify-center rounded-[6px] text-[#525252] transition-colors hover:bg-[#F5F5F5]"
            aria-label="Project actions"
          >
            <svg viewBox="0 0 16 16" fill="currentColor" className="h-[15px] w-[15px]">
              <circle cx="8" cy="3.5" r="1.15" />
              <circle cx="8" cy="8" r="1.15" />
              <circle cx="8" cy="12.5" r="1.15" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 max-w-full flex-wrap items-start gap-2 overflow-visible rounded-[8px] bg-[#F5F5F5] p-[2px]">
          {PAGE_TABS.map((tab) => {
            const isActive = tab.key === activeTab;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => onTabChange(tab.key)}
                className={`inline-flex h-[27px] cursor-pointer items-center gap-2 whitespace-nowrap rounded-[6px] px-[10px] py-[6px] text-[13px] font-medium leading-[1.25] transition-all duration-150 ${
                  isActive
                    ? "bg-gradient-to-b from-[#8D87FF] to-[#7B76DF] text-[#F3F2FE] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]"
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

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            className="inline-flex h-[27px] cursor-pointer items-center gap-2 rounded-[6px] px-[10px] py-[6px] text-[13px] font-medium leading-[1.25] text-[#525252] transition-colors hover:bg-[#F5F5F5]"
          >
          <span className="whitespace-nowrap">Client Portal</span>
          <img
            src="/logos/dashboard/redirect.svg"
            alt=""
            aria-hidden="true"
            className="h-[15px] w-[15px] shrink-0"
          />
        </button>
        </div>
      </div>
    </section>
  );
}
