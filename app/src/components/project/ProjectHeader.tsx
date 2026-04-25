import { DotsThreeVertical, ShareNetwork } from "@phosphor-icons/react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import type { Project } from "@/types";

export type ProjectTab = "overview" | "research" | "strategy" | "flows" | "moodboard" | "generate" | "assets";

type ProjectHeaderProps = {
  project: Project;
  activeTab: ProjectTab;
  onTabChange: (tab: ProjectTab) => void;
  onShare: () => void;
  onEditName: () => void;
  onEditClient: () => void;
  onAdjustTimeline: () => void;
  onEditPhases: () => void;
  onTogglePaused: () => void;
  onDelete: () => void;
};

/* ─── Tab bar icons (matching prototype exactly) ─── */

function OverviewIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={`h-[15px] w-[15px] shrink-0 transition-colors ${active ? "text-[#F3F2FE]" : "text-[#737373]"}`}>
      <rect x="2" y="2" width="5" height="5" rx="1" />
      <rect x="9" y="2" width="5" height="5" rx="1" />
      <rect x="2" y="9" width="5" height="5" rx="1" />
      <rect x="9" y="9" width="5" height="5" rx="1" />
    </svg>
  );
}

function ResearchIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={`h-[15px] w-[15px] shrink-0 transition-colors ${active ? "text-[#F3F2FE]" : "text-[#737373]"}`}>
      <circle cx="7" cy="7" r="4.5" />
      <path d="M10.5 10.5L14 14" />
    </svg>
  );
}

function StrategyIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={`h-[15px] w-[15px] shrink-0 transition-colors ${active ? "text-[#F3F2FE]" : "text-[#737373]"}`}>
      <path d="M3 3h10v10H3z" />
      <path d="M6 6h4M6 8.5h4M6 11h2.5" />
    </svg>
  );
}

function GenerateIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={`h-[15px] w-[15px] shrink-0 transition-colors ${active ? "text-[#F3F2FE]" : "text-[#737373]"}`}>
      <path d="M8 2l1.5 3.5L13 7l-3 2.5L11 13l-3-2-3 2 1-3.5L3 7l3.5-1.5z" />
    </svg>
  );
}

function FlowsIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={`h-[15px] w-[15px] shrink-0 transition-colors ${active ? "text-[#F3F2FE]" : "text-[#737373]"}`}>
      <path d="M4 3v4c0 1.1.9 2 2 2h4c1.1 0 2 .9 2 2v2" />
      <circle cx="4" cy="3" r="1.5" />
      <circle cx="12" cy="13" r="1.5" />
    </svg>
  );
}

function MoodboardIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={`h-[15px] w-[15px] shrink-0 transition-colors ${active ? "text-[#F3F2FE]" : "text-[#737373]"}`}>
      <rect x="2" y="2" width="5" height="7" rx="1" />
      <rect x="9" y="2" width="5" height="4" rx="1" />
      <rect x="2" y="11" width="5" height="3" rx="1" />
      <rect x="9" y="8" width="5" height="6" rx="1" />
    </svg>
  );
}

function AssetsIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={`h-[15px] w-[15px] shrink-0 transition-colors ${active ? "text-[#F3F2FE]" : "text-[#737373]"}`}>
      <path d="M2 4h12v8H2z" />
      <circle cx="5.5" cy="7" r="1.5" strokeWidth="1" />
      <path d="M2 11l3.5-3 2.5 2 3-3.5L14 10" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const PAGE_TABS = [
  { key: "overview", label: "Overview", Icon: OverviewIcon },
  { key: "research", label: "Research", Icon: ResearchIcon },
  { key: "strategy", label: "Strategy", Icon: StrategyIcon },
  { key: "flows", label: "Flows", Icon: FlowsIcon },
  { key: "moodboard", label: "Moodboard", Icon: MoodboardIcon },
  { key: "generate", label: "Generate", Icon: GenerateIcon },
  { key: "assets", label: "Assets", Icon: AssetsIcon },
] as const;

export function ProjectHeader({
  project,
  activeTab,
  onTabChange,
  onShare,
  onEditName,
  onEditClient,
  onAdjustTimeline,
  onEditPhases,
  onTogglePaused,
  onDelete,
}: ProjectHeaderProps) {
  const isOwner = project.accessRole !== "editor";

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h1 className="max-w-[720px] font-heading text-[20px] font-semibold leading-[1.2] text-[#0A0A0A]">
          {project.name}
        </h1>
        <p className="mt-2 text-[13px] font-medium leading-[1.2] text-[#737373]">
          {project.clientName}
        </p>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-start gap-2 overflow-x-auto rounded-[8px] bg-[#F5F5F5] p-[2px] scrollbar-hide">
          {PAGE_TABS.map((tab) => {
            const isActive = tab.key === activeTab;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => onTabChange(tab.key as ProjectTab)}
                className={`inline-flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-[6px] px-[10px] py-[6px] text-[13px] font-medium leading-none transition-all duration-150 ${
                  isActive
                    ? "bg-gradient-to-b from-[#8D87FF] to-[#7B76DF] text-[#F3F2FE] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]"
                    : "text-[#737373] hover:bg-white"
                }`}
              >
                <tab.Icon active={isActive} />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          {isOwner ? (
            <button
              type="button"
              onClick={onShare}
              className="inline-flex cursor-pointer items-center gap-[6px] rounded-[6px] bg-[#F5F5F5] px-[10px] py-[6px] text-[13px] font-medium text-[#262626] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#EFEFEF]"
            >
              <ShareNetwork size={13} />
              Share
            </button>
          ) : null}

          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="flex h-[27px] w-[27px] cursor-pointer items-center justify-center rounded-[6px] text-[#525252] transition-colors hover:bg-[#F5F5F5]">
                <DotsThreeVertical size={16} weight="bold" />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                sideOffset={6}
                className="min-w-[180px] max-w-[calc(100vw-24px)] rounded-lg border border-border bg-white p-1 shadow-[0_4px_16px_rgba(26,26,46,0.08)]"
              >
                <DropdownMenu.Item
                  onSelect={onEditName}
                  className="cursor-pointer rounded-[5px] px-2.5 py-[7px] text-[13px] text-text-primary outline-none hover:bg-border-subtle"
                >
                  Edit project name
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  onSelect={onEditClient}
                  className="cursor-pointer rounded-[5px] px-2.5 py-[7px] text-[13px] text-text-primary outline-none hover:bg-border-subtle"
                >
                  Edit client
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  onSelect={onAdjustTimeline}
                  className="cursor-pointer rounded-[5px] px-2.5 py-[7px] text-[13px] text-text-primary outline-none hover:bg-border-subtle"
                >
                  Adjust timeline
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  onSelect={onEditPhases}
                  className="cursor-pointer rounded-[5px] px-2.5 py-[7px] text-[13px] text-text-primary outline-none hover:bg-border-subtle"
                >
                  Add or remove phases
                </DropdownMenu.Item>
                <DropdownMenu.Separator className="my-1 h-px bg-border-subtle" />
                <DropdownMenu.Item
                  onSelect={onTogglePaused}
                  className="cursor-pointer rounded-[5px] px-2.5 py-[7px] text-[13px] text-text-primary outline-none hover:bg-border-subtle"
                >
                  {project.status === "paused" ? "Resume project" : "Pause project"}
                </DropdownMenu.Item>
                {isOwner ? (
                  <>
                    <DropdownMenu.Separator className="my-1 h-px bg-border-subtle" />
                    <DropdownMenu.Item
                      onSelect={onDelete}
                      className="cursor-pointer rounded-[5px] px-2.5 py-[7px] text-[13px] text-destructive outline-none hover:bg-destructive/5"
                    >
                      Delete project
                    </DropdownMenu.Item>
                  </>
                ) : null}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </div>

    </section>
  );
}
