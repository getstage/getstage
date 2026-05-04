import type { Project, ProjectTab } from "../models/project";

const PAGE_TABS: { key: ProjectTab; label: string; icon: (active: boolean) => React.ReactNode }[] = [
  {
    key: "overview",
    label: "Overview",
    icon: (active) => (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={`h-[15px] w-[15px] shrink-0 transition-colors ${active ? "text-[#F3F2FE]" : "text-[#737373]"}`}>
        <rect x="2" y="2" width="5" height="5" rx="1" />
        <rect x="9" y="2" width="5" height="5" rx="1" />
        <rect x="2" y="9" width="5" height="5" rx="1" />
        <rect x="9" y="9" width="5" height="5" rx="1" />
      </svg>
    ),
  },
  {
    key: "research",
    label: "Research",
    icon: (active) => (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={`h-[15px] w-[15px] shrink-0 transition-colors ${active ? "text-[#F3F2FE]" : "text-[#737373]"}`}>
        <circle cx="7" cy="7" r="4.5" />
        <path d="M10.5 10.5L14 14" />
      </svg>
    ),
  },
  {
    key: "strategy",
    label: "Strategy",
    icon: (active) => (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={`h-[15px] w-[15px] shrink-0 transition-colors ${active ? "text-[#F3F2FE]" : "text-[#737373]"}`}>
        <path d="M3 3h10v10H3z" />
        <path d="M6 6h4M6 8.5h4M6 11h2.5" />
      </svg>
    ),
  },
  {
    key: "moodboard",
    label: "Moodboard",
    icon: (active) => (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={`h-[15px] w-[15px] shrink-0 transition-colors ${active ? "text-[#F3F2FE]" : "text-[#737373]"}`}>
        <rect x="2" y="2" width="5" height="7" rx="1" />
        <rect x="9" y="2" width="5" height="4" rx="1" />
        <rect x="2" y="11" width="5" height="3" rx="1" />
        <rect x="9" y="8" width="5" height="6" rx="1" />
      </svg>
    ),
  },
  {
    key: "flows",
    label: "Flows",
    icon: (active) => (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={`h-[15px] w-[15px] shrink-0 transition-colors ${active ? "text-[#F3F2FE]" : "text-[#737373]"}`}>
        <path d="M4 3v4c0 1.1.9 2 2 2h4c1.1 0 2 .9 2 2v2" />
        <circle cx="4" cy="3" r="1.5" />
        <circle cx="12" cy="13" r="1.5" />
      </svg>
    ),
  },
  {
    key: "generate",
    label: "Generate",
    icon: (active) => (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={`h-[15px] w-[15px] shrink-0 transition-colors ${active ? "text-[#F3F2FE]" : "text-[#737373]"}`}>
        <path d="M8 2l1.5 3.5L13 7l-3 2.5L11 13l-3-2-3 2 1-3.5L3 7l3.5-1.5z" />
      </svg>
    ),
  },
  {
    key: "assets",
    label: "Assets",
    icon: (active) => (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={`h-[15px] w-[15px] shrink-0 transition-colors ${active ? "text-[#F3F2FE]" : "text-[#737373]"}`}>
        <rect x="2.5" y="4" width="11" height="8" rx="1" />
        <path d="M5 10l2-2 1.5 1.5L10 8l2 2.5" />
      </svg>
    ),
  },
];

export function ProjectHeader({
  project,
  activeTab,
  onTabChange,
}: {
  project: Project;
  activeTab: ProjectTab;
  onTabChange: (tab: ProjectTab) => void;
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
            className="inline-flex h-[27px] cursor-pointer items-center gap-2 rounded-[6px] bg-[#F5F5F5] py-[6px] pl-[10px] pr-3 text-[13px] font-medium leading-none text-[#262626] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#ECECEC]"
          >
            Share
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-[15px] w-[15px]">
              <circle cx="5" cy="8" r="1.8" />
              <circle cx="11.5" cy="4.5" r="1.8" />
              <circle cx="11.5" cy="11.5" r="1.8" />
              <path d="M6.6 7.1 9.9 5.3M6.6 8.9l3.3 1.8" />
            </svg>
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
                className={`inline-flex h-[27px] cursor-pointer items-center gap-2 whitespace-nowrap rounded-[6px] px-[10px] py-[6px] text-[13px] font-medium leading-none transition-all duration-150 ${
                  isActive
                    ? "bg-gradient-to-b from-[#8D87FF] to-[#7B76DF] text-[#F3F2FE] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]"
                    : "text-[#737373] hover:bg-white"
                }`}
              >
                {tab.icon(isActive)}
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            className="inline-flex h-[27px] cursor-pointer items-center gap-2 rounded-[6px] px-[10px] py-[6px] text-[13px] font-medium leading-none text-[#525252] transition-colors hover:bg-[#F5F5F5]"
          >
            Client Portal
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-[15px] w-[15px]">
              <path d="M6.5 4H4.75A1.75 1.75 0 0 0 3 5.75v5.5C3 12.2 3.8 13 4.75 13h5.5A1.75 1.75 0 0 0 12 11.25V9.5" />
              <path d="M9 3h4v4M8 8l5-5" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}
