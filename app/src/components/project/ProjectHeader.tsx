import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { DotsThreeVertical, ShareNetwork } from "@phosphor-icons/react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import type { Project } from "@/types";
import { PROJECT_TYPE_LABELS } from "@/types";

export type ProjectTab = "overview" | "research" | "strategy" | "generate" | "assets";

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

function formatDateShort(ms: number): string {
  const d = new Date(ms);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

/* ─── Tab bar icons (matching prototype exactly) ─── */

function OverviewIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={`h-4 w-4 shrink-0 transition-colors ${active ? "text-white/70" : "text-text-tertiary"}`}>
      <rect x="2" y="2" width="5" height="5" rx="1" />
      <rect x="9" y="2" width="5" height="5" rx="1" />
      <rect x="2" y="9" width="5" height="5" rx="1" />
      <rect x="9" y="9" width="5" height="5" rx="1" />
    </svg>
  );
}

function ResearchIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={`h-4 w-4 shrink-0 transition-colors ${active ? "text-white/70" : "text-text-tertiary"}`}>
      <circle cx="7" cy="7" r="4.5" />
      <path d="M10.5 10.5L14 14" />
    </svg>
  );
}

function StrategyIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={`h-4 w-4 shrink-0 transition-colors ${active ? "text-white/70" : "text-text-tertiary"}`}>
      <path d="M3 3h10v10H3z" />
      <path d="M6 6h4M6 8.5h4M6 11h2.5" />
    </svg>
  );
}

function GenerateIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={`h-4 w-4 shrink-0 transition-colors ${active ? "text-white/70" : "text-text-tertiary"}`}>
      <path d="M8 2l1.5 3.5L13 7l-3 2.5L11 13l-3-2-3 2 1-3.5L3 7l3.5-1.5z" />
    </svg>
  );
}

function AssetsIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={`h-4 w-4 shrink-0 transition-colors ${active ? "text-white/70" : "text-text-tertiary"}`}>
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

  const totalTasks = useMemo(
    () => project.phases.reduce((sum, ph) => sum + ph.tasks.length, 0),
    [project.phases],
  );

  const circumference = 2 * Math.PI * 38;
  const progressOffset = circumference - (project.progress / 100) * circumference;

  return (
    <section className="flex flex-col">
      {/* NAV ROW: page tabs left + Share/More right */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-6 pt-2">
        <div className="flex items-center gap-2">
          {PAGE_TABS.map((tab) => {
            const isActive = tab.key === activeTab;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => onTabChange(tab.key as ProjectTab)}
                className={`inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-[9px] border px-5 py-[9px] text-[14px] font-medium transition-all duration-150 ${
                  isActive
                    ? "border-text-primary bg-text-primary text-white"
                    : "border-border bg-transparent text-text-secondary hover:border-text-secondary hover:bg-border-subtle hover:text-text-primary"
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
              className="inline-flex cursor-pointer items-center gap-[5px] rounded-[8px] border border-border bg-transparent px-4 py-2 text-[13px] font-medium text-text-secondary transition-all duration-150 hover:border-text-secondary hover:text-text-primary"
            >
              <ShareNetwork size={13} />
              Share
            </button>
          ) : null}

          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="flex h-[34px] w-[34px] cursor-pointer items-center justify-center rounded-[9px] border border-border bg-transparent text-text-secondary transition-all duration-150 hover:border-text-secondary hover:text-text-primary">
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

      {/* PROJECT HERO: ring + identity left, metadata right */}
      <div className="flex flex-col items-center gap-6 pt-2 text-center sm:flex-row sm:items-start sm:gap-14 sm:text-left">
        {/* Left: progress ring + identity */}
        <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start sm:gap-6">
          {/* Progress ring */}
          <div className="relative h-[88px] w-[88px] shrink-0">
            <svg viewBox="0 0 88 88" className="h-[88px] w-[88px] -rotate-90">
              <circle
                cx="44"
                cy="44"
                r="38"
                fill="none"
                stroke="var(--color-border-subtle)"
                strokeWidth="4"
              />
              <circle
                cx="44"
                cy="44"
                r="38"
                fill="none"
                stroke="var(--color-accent)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={progressOffset}
                className="transition-[stroke-dashoffset] duration-500 ease-out"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center font-heading text-[22px] font-semibold tracking-[-0.5px] text-text-primary">
              {project.progress}
            </span>
          </div>

          {/* Identity */}
          <div className="pt-0 sm:pt-3">
            <h1 className="max-w-[720px] text-balance font-heading text-[26px] font-semibold leading-[1.25] tracking-[-0.5px] text-text-primary">
              {project.name}
            </h1>
            <p className="mt-1 text-[14px] text-text-secondary">
              {project.clientName}
            </p>
          </div>
        </div>

        {/* Right: metadata */}
        <div className="hidden shrink-0 flex-col gap-3.5 pt-3 sm:ml-auto sm:flex">
          <MetaRow
            icon={
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-text-tertiary">
                <rect x="2" y="3" width="12" height="11" rx="1.5" />
                <path d="M2 6.5h12" />
                <path d="M5.5 1.5v3M10.5 1.5v3" />
              </svg>
            }
            label="Timeline"
            value={`${formatDateShort(project.startDate)} – ${formatDateShort(project.endDate)}`}
          />
          <MetaRow
            icon={
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-text-tertiary">
                <circle cx="8" cy="8" r="6" />
                <path d="M8 5v3l2 1.5" />
              </svg>
            }
            label="Type"
            value={PROJECT_TYPE_LABELS[project.type]}
          />
          <MetaRow
            icon={
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-text-tertiary">
                <path d="M3 3h10v10H3z" />
                <path d="M6 6h4M6 8.5h4M6 11h2.5" />
              </svg>
            }
            label="Scope"
            value={`${project.phases.length} phase${project.phases.length !== 1 ? "s" : ""} · ${totalTasks} task${totalTasks !== 1 ? "s" : ""}`}
          />

        </div>
      </div>

      {/* Mobile-only action buttons */}
      <div className="mt-4 flex flex-col items-stretch gap-2.5 sm:hidden">
        <Link
          to="/project/$id/stitch"
          params={{ id: project.id }}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[10px] border border-[rgba(59,175,218,0.24)] bg-white px-4 text-[15px] font-medium text-[#0891b2]"
        >
          <img src="/stitch.png" alt="" className="h-4 w-4 rounded-[3px]" />
          Stitch
        </Link>
      </div>
    </section>
  );
}

type MetaRowProps = {
  icon: React.ReactNode;
  label: string;
  value: string;
};

function MetaRow({ icon, label, value }: MetaRowProps) {
  return (
    <div className="flex items-center gap-2.5 text-[13px]">
      {icon}
      <span className="min-w-[56px] text-text-tertiary">{label}</span>
      <span className="text-text-primary">{value}</span>
    </div>
  );
}
