import { useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CaretDown, Check, Plus } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import { getProjects } from "@/data-ops/queries";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import { Timeline, type TimelineHorizon } from "@/components/dashboard/Timeline";

export function DashboardPage() {
  const [timelineHorizon, setTimelineHorizon] = useState<TimelineHorizon>("this-month");
  const dockItemRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const [dockIsHovering, setDockIsHovering] = useState(false);
  const [dockSizes, setDockSizes] = useState<number[]>([]);
  const [activeDockIndex, setActiveDockIndex] = useState<number | null>(null);
  const { user } = useAuth();
  const { data: projects, isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: getProjects,
  });

  const greeting = getGreeting(user?.name?.split(" ")[0] ?? "there");
  const activeProjects = projects?.filter((project) => project.status === "active") ?? [];
  const activeCount = activeProjects.length;
  const taskEntries = (projects ?? []).flatMap((project) =>
    project.phases.flatMap((phase) =>
      phase.tasks.map((task) => ({
        task,
        phase,
        project,
      })),
    ),
  );
  const tasksDue = taskEntries.filter((entry) => !entry.task.isCompleted).length;
  const completed = taskEntries.filter((entry) => entry.task.isCompleted).length;
  const avgProgress =
    taskEntries.length > 0 ? Math.round((completed / taskEntries.length) * 100) : 0;
  const upcomingTasks = taskEntries
    .filter((entry) => !entry.task.isCompleted)
    .sort((a, b) => a.task.createdAt - b.task.createdAt)
    .slice(0, 3);
  const recentActivity = taskEntries
    .sort((a, b) => b.task.updatedAt - a.task.updatedAt)
    .slice(0, 3);
  const paymentRows = activeProjects.slice(0, 3).map((project, index) => ({
    name: project.clientName,
    avatarUrl: project.clientAvatarUrl,
    amount: 4500 - index * 1300,
  }));
  const receivedTotal = paymentRows.reduce((sum, row) => sum + row.amount, 0);
  const outstandingTotal = Math.round(receivedTotal * 0.5);
  const outstandingDisplay = formatCurrencyDisplay(outstandingTotal);
  const receivedDisplay = formatCurrencyDisplay(receivedTotal);
  const pendingDisplay = formatCurrencyDisplay(outstandingTotal);
  const dockProjects = (projects ?? []).slice(0, 6);
  const DOCK_BASE_SIZE = 44;
  const DOCK_MAX_SIZE = 72;
  const DOCK_SIGMA = 55;

  useEffect(() => {
    dockItemRefs.current = dockItemRefs.current.slice(0, dockProjects.length);
    setDockSizes(Array.from({ length: dockProjects.length }, () => DOCK_BASE_SIZE));
    setActiveDockIndex(null);
  }, [dockProjects.length]);

  const handleDockMouseMove = (clientX: number) => {
    if (dockProjects.length === 0) return;

    let closestIndex = 0;
    let minDistance = Number.POSITIVE_INFINITY;

    const nextSizes = dockProjects.map((_, index) => {
      const item = dockItemRefs.current[index];
      if (!item) return DOCK_BASE_SIZE;

      const rect = item.getBoundingClientRect();
      const center = rect.left + rect.width / 2;
      const distance = Math.abs(clientX - center);

      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = index;
      }

      const scale = Math.exp(-(distance * distance) / (2 * DOCK_SIGMA * DOCK_SIGMA));
      return Math.round(DOCK_BASE_SIZE + (DOCK_MAX_SIZE - DOCK_BASE_SIZE) * scale);
    });

    setDockSizes(nextSizes);
    setActiveDockIndex(closestIndex);
  };

  return (
    <>
      <Helmet>
        <title>Dashboard — Stage</title>
      </Helmet>

      <div className="min-h-[calc(100vh-64px)]">
        <div className="mx-auto max-w-[1200px] px-6 pt-8 sm:px-10 lg:px-14">
          <div className="mb-11">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="min-w-[320px]"
            >
              <h1 className="font-heading text-[20px] leading-[1.2] font-medium tracking-[-0.2px] text-text-primary">
                {greeting}
              </h1>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <TimelineDateSelector value={timelineHorizon} onChange={setTimelineHorizon} />

                <Link to="/new-project" className="shrink-0">
                  <Button className="h-[34px] rounded-[7px] px-3 text-[13px]">
                    <Plus size={11} weight="bold" aria-hidden="true" />
                    New Project
                  </Button>
                </Link>
              </div>

              <div className="mt-5 flex flex-wrap items-start gap-x-12 gap-y-3">
                <CompactStat label="Active Projects" value={activeCount.toLocaleString()} />
                <CompactStat label="Tasks Due" value={tasksDue.toLocaleString()} />
                <CompactStat label="Completed" value={completed.toLocaleString()} />
                <CompactStat label="Avg. Progress" value={`${avgProgress}%`} />
              </div>
            </motion.div>
          </div>
        </div>

        {isLoading ? (
          <div className="relative left-1/2 mt-0 w-screen -translate-x-1/2">
            <TimelineSkeleton />
          </div>
        ) : projects && projects.length > 0 ? (
          <div className="relative left-1/2 mt-0 w-screen -translate-x-1/2">
            <Timeline projects={projects} horizon={timelineHorizon} />
          </div>
        ) : (
          <div className="mx-auto max-w-[1200px] px-6 sm:px-10 lg:px-14">
            <EmptyState />
          </div>
        )}

        {projects && projects.length > 0 && (
          <div className="mx-auto max-w-[1200px] px-6 pb-32 sm:px-10 lg:px-14">
            <div className="mt-14 space-y-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <InfoCard className="h-full" title="Upcoming">
                  {upcomingTasks.length > 0 ? (
                    <div className="space-y-0">
                      {upcomingTasks.map((entry, index) => (
                        <div
                          key={entry.task.id}
                          className={`flex items-center gap-2.5 py-1.5 text-[13px] ${
                            index > 0 ? "border-t border-border-subtle" : ""
                          }`}
                        >
                          <div className="h-5 w-5 overflow-hidden rounded-full bg-input-bg">
                            {entry.project.clientAvatarUrl ? (
                              <img
                                src={entry.project.clientAvatarUrl}
                                alt={entry.project.clientName}
                                className="h-full w-full object-cover"
                              />
                            ) : null}
                          </div>
                          <span className="truncate text-text-primary">{entry.task.title}</span>
                          <span className="ml-auto rounded-full bg-border-subtle px-2 py-0.5 text-[11px] text-text-secondary">
                            {entry.phase.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[13px] text-text-secondary">No upcoming tasks.</p>
                  )}
                </InfoCard>

                <InfoCard className="h-full" title="Recent Activity">
                  {recentActivity.length > 0 ? (
                    <div className="space-y-0">
                      {recentActivity.map((entry, index) => {
                        const actionLabel = entry.task.isCompleted ? "Completed" : "Added";
                        return (
                          <div
                            key={entry.task.id}
                            className={`py-1.5 text-[13px] leading-[1.45] ${
                              index > 0 ? "border-t border-border-subtle" : ""
                            }`}
                          >
                            <span className="text-text-secondary">{actionLabel}: </span>
                            <span className="font-medium text-text-primary">{entry.task.title}</span>
                            <span className="text-text-secondary"> — {entry.project.clientName}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-[13px] text-text-secondary">No recent activity.</p>
                  )}
                </InfoCard>
              </div>

              <InfoCard title="Payments">
                <div className="grid gap-5 md:grid-cols-[minmax(240px,0.95fr)_minmax(0,1.35fr)_minmax(128px,auto)] md:items-start">
                  <div className="grid min-w-0 grid-cols-2 gap-5 md:pr-3">
                    <div className="min-w-0">
                      <p className="text-[12px] text-text-secondary">Outstanding</p>
                      <p
                        className="mt-1 font-heading text-[18px] leading-none font-semibold whitespace-nowrap tabular-nums text-text-primary"
                        title={outstandingDisplay.isCompact ? outstandingDisplay.full : undefined}
                        aria-label={outstandingDisplay.isCompact ? outstandingDisplay.full : undefined}
                      >
                        {outstandingDisplay.short}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[12px] text-text-secondary">Received</p>
                      <p
                        className="mt-1 font-heading text-[18px] leading-none font-semibold whitespace-nowrap tabular-nums text-accent"
                        title={receivedDisplay.isCompact ? receivedDisplay.full : undefined}
                        aria-label={receivedDisplay.isCompact ? receivedDisplay.full : undefined}
                      >
                        {receivedDisplay.short}
                      </p>
                    </div>
                  </div>

                  {paymentRows.length > 0 ? (
                    <>
                      <div className="min-w-0 space-y-2 border-t border-border-subtle pt-3 md:border-t-0 md:border-l md:pl-5 md:pt-0">
                        {paymentRows.map((row) => (
                          <div key={row.name} className="flex items-center gap-2 text-[13px]">
                            <div className="h-5 w-5 overflow-hidden rounded-full bg-input-bg">
                              {row.avatarUrl ? (
                                <img
                                  src={row.avatarUrl}
                                  alt={row.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : null}
                            </div>
                            <span className="truncate text-text-primary">{row.name}</span>
                          </div>
                        ))}
                      </div>

                      <div className="min-w-0 space-y-2 text-left md:text-right">
                        {paymentRows.map((row) => {
                          const rowAmountDisplay = formatCurrencyDisplay(row.amount);
                          return (
                            <div
                              key={`${row.name}-${row.amount}`}
                              className="flex items-center gap-1.5 text-[13px] md:justify-end"
                            >
                              <Check
                                size={11}
                                weight="bold"
                                aria-hidden="true"
                                className="text-accent"
                              />
                              <span
                                className="font-medium whitespace-nowrap tabular-nums text-accent"
                                title={rowAmountDisplay.isCompact ? rowAmountDisplay.full : undefined}
                                aria-label={rowAmountDisplay.isCompact ? rowAmountDisplay.full : undefined}
                              >
                                {rowAmountDisplay.short}
                              </span>
                            </div>
                          );
                        })}
                        <p className="pt-0.5 text-[13px] text-text-secondary">
                          <span className="mr-1">Pending</span>
                          <span
                            className="whitespace-nowrap tabular-nums"
                            title={pendingDisplay.isCompact ? pendingDisplay.full : undefined}
                            aria-label={pendingDisplay.isCompact ? pendingDisplay.full : undefined}
                          >
                            {pendingDisplay.short}
                          </span>
                        </p>
                      </div>
                    </>
                  ) : (
                    <p className="text-[13px] text-text-secondary">No payment rows.</p>
                  )}
                </div>
              </InfoCard>
            </div>
          </div>
        )}

        {dockProjects.length > 0 && (
          <div
            className="pointer-events-none fixed left-1/2 z-40 -translate-x-1/2"
            style={{ bottom: "max(20px, calc(env(safe-area-inset-bottom) + 8px))" }}
          >
            <div
              className="pointer-events-auto flex items-end gap-2 rounded-[18px] border border-white/10 bg-[#151520] px-4 py-2.5 shadow-[0_8px_32px_rgba(0,0,0,0.24)]"
              onMouseEnter={() => setDockIsHovering(true)}
              onMouseMove={(event) => handleDockMouseMove(event.clientX)}
              onMouseLeave={() => {
                setDockIsHovering(false);
                setDockSizes(Array.from({ length: dockProjects.length }, () => DOCK_BASE_SIZE));
                setActiveDockIndex(null);
              }}
            >
              {dockProjects.map((project, index) => {
                const size = dockSizes[index] ?? DOCK_BASE_SIZE;
                const isActive = activeDockIndex === index;

                return (
                  <Link
                    key={project.id}
                    to="/project/$id"
                    params={{ id: project.id }}
                    ref={(element) => {
                      dockItemRefs.current[index] = element;
                    }}
                    className="relative block shrink-0 cursor-pointer outline-none focus:outline-none focus-visible:outline-none"
                    style={{
                      width: `${size}px`,
                      height: `${size}px`,
                      transition: dockIsHovering ? "none" : "width 200ms ease, height 200ms ease",
                    }}
                  >
                    <div
                      className={`pointer-events-none absolute bottom-full left-1/2 mb-2.5 -translate-x-1/2 whitespace-nowrap rounded-[8px] border border-white/10 bg-[#333546] px-3 py-2 opacity-0 shadow-[0_4px_16px_rgba(0,0,0,0.3)] transition-opacity duration-150 ${
                        isActive ? "opacity-100" : ""
                      }`}
                    >
                      <div className="text-[13px] font-medium leading-[1.3] text-white">
                        {project.name}
                      </div>
                      <div className="text-[12px] leading-[1.3] text-white/50">
                        {project.clientName}
                      </div>
                    </div>

                    {project.clientAvatarUrl ? (
                      <img
                        src={project.clientAvatarUrl}
                        alt={project.name}
                        className={`h-full w-full rounded-full object-cover shadow-[0_2px_8px_rgba(0,0,0,0.2)] ${
                          isActive ? "shadow-[0_4px_14px_rgba(135,130,245,0.34)]" : ""
                        }`}
                      />
                    ) : (
                      <div
                        className={`flex h-full w-full items-center justify-center rounded-full bg-[#2A2D44] text-[13px] font-medium text-white ${
                          isActive ? "shadow-[0_4px_14px_rgba(135,130,245,0.34)]" : ""
                        }`}
                      >
                        {project.clientName.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function formatCurrency(value: number) {
  if (!Number.isFinite(value)) return "—";
  const sign = value < 0 ? "-" : "";
  return `${sign}$${Math.abs(value).toLocaleString("en-US")}`;
}

function formatCompactCurrency(value: number) {
  if (!Number.isFinite(value)) return "—";

  const absolute = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  const units: Array<{ threshold: number; suffix: string }> = [
    { threshold: 1_000_000_000_000, suffix: "T" },
    { threshold: 1_000_000_000, suffix: "B" },
    { threshold: 1_000_000, suffix: "M" },
    { threshold: 1_000, suffix: "K" },
  ];

  for (const unit of units) {
    if (absolute >= unit.threshold) {
      const scaled = absolute / unit.threshold;
      const rounded = scaled >= 100 ? Math.round(scaled) : Math.round(scaled * 10) / 10;
      const compact = Number.isInteger(rounded)
        ? `${rounded}`
        : `${rounded}`.replace(/\.0$/, "");
      return `${sign}$${compact}${unit.suffix}`;
    }
  }

  return formatCurrency(value);
}

function formatCurrencyDisplay(value: number) {
  if (!Number.isFinite(value)) {
    return { short: "—", full: "—", isCompact: false };
  }

  const full = formatCurrency(value);
  const isCompact = Math.abs(value) >= 1_000_000;
  return {
    short: isCompact ? formatCompactCurrency(value) : full,
    full,
    isCompact,
  };
}

function getGreeting(name: string) {
  const hour = new Date().getHours();
  if (hour < 12) return `Good morning, ${name}`;
  if (hour < 18) return `Good afternoon, ${name}`;
  return `Good evening, ${name}`;
}

function EmptyState() {
  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center rounded-[16px] border border-border-subtle bg-white">
      <h2 className="mb-2 font-heading text-[20px] font-medium text-text-primary">
        No projects yet.
      </h2>
      <p className="mb-6 text-[15px] text-text-secondary">
        Create your first project to get started.
      </p>
      <Link to="/new-project">
        <Button>Create your first project</Button>
      </Link>
    </div>
  );
}

function TimelineSkeleton() {
  return (
    <div className="relative h-[60vh] min-h-[420px] max-h-[640px] overflow-hidden px-6 sm:px-10 lg:px-14">
      <div className="relative h-full">
        <div className="absolute inset-x-0 top-[96px] skeleton h-px rounded-full" />
        <div className="absolute inset-x-0 top-[168px] skeleton h-px rounded-full" />
        <div className="absolute inset-x-0 bottom-[54px] skeleton h-px rounded-full" />
        <div className="absolute bottom-9 left-[8%] h-5 w-12 skeleton rounded-full" />
        <div className="absolute bottom-9 left-[22%] h-5 w-12 skeleton rounded-full" />
        <div className="absolute bottom-9 left-[37%] h-5 w-12 skeleton rounded-full" />
        <div className="absolute bottom-9 left-[52%] h-5 w-12 skeleton rounded-full" />
        <div className="absolute left-[14%] top-[66px] h-[52px] w-[210px] skeleton rounded-[10px]" />
        <div className="absolute left-[36%] top-[128px] h-[52px] w-[250px] skeleton rounded-[10px]" />
        <div className="absolute left-[58%] top-[190px] h-[52px] w-[290px] skeleton rounded-[10px]" />
        <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-bg to-transparent backdrop-blur-[2px]" />
        <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-bg to-transparent backdrop-blur-[2px]" />
      </div>
    </div>
  );
}

function CompactStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-[86px]">
      <div className="text-[13px] text-text-secondary">{label}</div>
      <div className="mt-0.5 font-heading text-[26px] leading-[1.15] font-semibold tracking-[-0.5px] tabular-nums text-text-primary">
        {value}
      </div>
    </div>
  );
}

const PERIOD_OPTIONS: Array<{ value: TimelineHorizon; label: string }> = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "this-week", label: "This week" },
  { value: "this-month", label: "This month" },
  { value: "this-year", label: "This year" },
];

const RANGE_OPTIONS: Array<{ value: TimelineHorizon; label: string }> = [
  { value: "30-days", label: "30 days" },
  { value: "6-months", label: "6 months" },
  { value: "12-months", label: "12 months" },
];

const ALL_TIME_OPTION: { value: TimelineHorizon; label: string } = {
  value: "all-time",
  label: "All time",
};

function TimelineDateSelector({
  value,
  onChange,
}: {
  value: TimelineHorizon;
  onChange: (value: TimelineHorizon) => void;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const selectedLabel = useMemo(() => {
    for (const option of [...PERIOD_OPTIONS, ...RANGE_OPTIONS, ALL_TIME_OPTION]) {
      if (option.value === value) return option.label;
    }
    return "This month";
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSelect = (nextValue: TimelineHorizon) => {
    onChange(nextValue);
    setIsOpen(false);
  };

  return (
    <div ref={rootRef} className="relative inline-flex w-fit">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
        className={`inline-flex h-[34px] items-center gap-1.5 rounded-[7px] border bg-white px-3 text-[13px] font-medium text-text-primary transition-colors outline-none focus:outline-none focus-visible:outline-none ${
          isOpen ? "border-text-secondary" : "border-border"
        }`}
      >
        <span>{selectedLabel}</span>
        <CaretDown
          size={11}
          weight="bold"
          aria-hidden="true"
          className={`text-text-secondary transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.14 } }}
            exit={{ opacity: 0, y: 4, transition: { duration: 0.12 } }}
            className="absolute left-0 top-full z-50 mt-1.5 min-w-[160px] rounded-[8px] border border-border bg-white p-1 shadow-[0_4px_16px_rgba(26,26,46,0.08)]"
          >
            <div className="px-2.5 pb-1 pt-1 text-[12px] font-medium text-text-secondary">
              Period
            </div>

            {PERIOD_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option.value)}
                role="option"
                aria-selected={value === option.value}
                className="flex w-full items-center justify-between rounded-[5px] px-2.5 py-1.5 text-left text-[14px] font-normal text-text-primary transition-colors hover:bg-border-subtle"
              >
                <span>{option.label}</span>
                {value === option.value ? (
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
                ) : null}
              </button>
            ))}

            <div className="my-1 h-px bg-border-subtle" />

            {RANGE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option.value)}
                role="option"
                aria-selected={value === option.value}
                className="flex w-full items-center justify-between rounded-[5px] px-2.5 py-1.5 text-left text-[14px] font-normal text-text-primary transition-colors hover:bg-border-subtle"
              >
                <span>{option.label}</span>
                {value === option.value ? (
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
                ) : null}
              </button>
            ))}

            <div className="my-1 h-px bg-border-subtle" />

            <button
              type="button"
              onClick={() => handleSelect(ALL_TIME_OPTION.value)}
              role="option"
              aria-selected={value === ALL_TIME_OPTION.value}
              className="flex w-full items-center justify-between rounded-[5px] px-2.5 py-1.5 text-left text-[14px] font-normal text-text-primary transition-colors hover:bg-border-subtle"
            >
              <span>{ALL_TIME_OPTION.label}</span>
              {value === ALL_TIME_OPTION.value ? (
                <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
              ) : null}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

function InfoCard({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[12px] border border-border bg-white px-[22px] py-5 ${className ?? ""}`}
    >
      <h2 className="mb-3 font-heading text-[15px] font-medium text-text-primary">{title}</h2>
      {children}
    </div>
  );
}
