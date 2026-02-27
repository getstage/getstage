import { useState } from "react";
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
  const [hoveredDockId, setHoveredDockId] = useState<string | null>(null);
  const [timelineHorizon, setTimelineHorizon] = useState<TimelineHorizon>("30d");
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
              <h1 className="font-heading text-[30px] leading-[1.14] font-semibold tracking-tight text-text-primary sm:text-[32px]">
                {greeting}
              </h1>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <TimelineDateSelector value={timelineHorizon} onChange={setTimelineHorizon} />

                <Link to="/new-project" className="shrink-0">
                  <Button className="h-10 rounded-[9px] px-5 text-[15px]">
                    <Plus size={12} weight="bold" aria-hidden="true" />
                    New Project
                  </Button>
                </Link>
              </div>

              <div className="mt-5 flex flex-wrap items-start gap-x-10 gap-y-3">
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
                          className={`flex items-center gap-2.5 py-2 text-[13px] ${
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
                          <span className="ml-auto rounded-full bg-bg-subtle px-2 py-0.5 text-[11px] text-text-secondary">
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
                            className={`py-2 text-[13px] ${
                              index > 0 ? "border-t border-border-subtle" : ""
                            }`}
                          >
                            <span className="text-text-secondary">{actionLabel}: </span>
                            <span className="font-medium text-text-primary">{entry.task.title}</span>
                            <span className="text-text-tertiary"> — {entry.project.clientName}</span>
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
                        className="mt-1 font-heading text-[22px] leading-none font-semibold whitespace-nowrap tabular-nums text-text-primary"
                        title={outstandingDisplay.isCompact ? outstandingDisplay.full : undefined}
                        aria-label={outstandingDisplay.isCompact ? outstandingDisplay.full : undefined}
                      >
                        {outstandingDisplay.short}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[12px] text-text-secondary">Received</p>
                      <p
                        className="mt-1 font-heading text-[22px] leading-none font-semibold whitespace-nowrap tabular-nums text-accent"
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
                              className="flex items-center gap-1.5 text-[12px] md:justify-end"
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
                        <p className="pt-0.5 text-[12px] text-text-secondary">
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
            className="pointer-events-none fixed inset-x-0 z-40 flex justify-center px-4"
            style={{ bottom: "max(12px, env(safe-area-inset-bottom))" }}
          >
            <div className="pointer-events-auto inline-flex items-center gap-2.5 rounded-[14px] bg-[#0E1022] px-4 py-2.5 shadow-[0_12px_26px_rgba(16,18,38,0.35)]">
              {dockProjects.map((project) => (
                <div
                  key={project.id}
                  className="relative"
                  onMouseEnter={() => setHoveredDockId(project.id)}
                  onMouseLeave={() =>
                    setHoveredDockId((current) => (current === project.id ? null : current))
                  }
                >
                  <AnimatePresence>
                    {hoveredDockId === project.id && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.97 }}
                        transition={{ duration: 0.16 }}
                        className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-3 -translate-x-1/2"
                      >
                        <div className="rounded-[11px] border border-white/15 bg-[#161A30] px-3 py-2 shadow-[0_14px_24px_rgba(8,10,24,0.55)]">
                          <div className="mx-auto h-14 w-14 overflow-hidden rounded-full border-2 border-[#8F8BF8] bg-[#0F1124]">
                            {project.clientAvatarUrl ? (
                              <img
                                src={project.clientAvatarUrl}
                                alt={project.clientName}
                                className="h-full w-full object-cover"
                              />
                            ) : null}
                          </div>
                          <div className="mt-2 max-w-[120px] truncate text-center text-[11px] font-medium text-white/90">
                            {project.clientName}
                          </div>
                        </div>
                        <div className="mx-auto -mt-1 h-2.5 w-2.5 rotate-45 border-r border-b border-white/15 bg-[#161A30]" />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <motion.button
                    type="button"
                    onFocus={() => setHoveredDockId(project.id)}
                    onBlur={() =>
                      setHoveredDockId((current) => (current === project.id ? null : current))
                    }
                    className="h-9 w-9 cursor-pointer overflow-hidden rounded-full border border-white/20 bg-white/10 outline-none"
                    animate={{
                      scale: hoveredDockId === project.id ? 1.12 : 1,
                      y: hoveredDockId === project.id ? -6 : 0,
                    }}
                    transition={{ duration: 0.16 }}
                  >
                    {project.clientAvatarUrl ? (
                      <img
                        src={project.clientAvatarUrl}
                        alt={project.clientName}
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </motion.button>
                </div>
              ))}
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
    <div className="w-[116px]">
      <div className="text-[13px] text-text-secondary">{label}</div>
      <div className="mt-1 font-heading text-[30px] leading-none font-semibold tracking-tight tabular-nums text-text-primary">
        {value}
      </div>
    </div>
  );
}

function TimelineDateSelector({
  value,
  onChange,
}: {
  value: TimelineHorizon;
  onChange: (value: TimelineHorizon) => void;
}) {
  const options: Array<{ value: TimelineHorizon; label: string }> = [
    { value: "30d", label: "This month" },
    { value: "90d", label: "This quarter" },
    { value: "6m", label: "Last 6 months" },
    { value: "all", label: "All time" },
  ];

  return (
    <div className="relative inline-flex w-fit">
      <select
        aria-label="Timeline horizon"
        value={value}
        onChange={(event) => onChange(event.target.value as TimelineHorizon)}
        className="h-10 appearance-none rounded-[10px] border border-border-subtle bg-white pl-3.5 pr-8 text-[14px] font-medium text-text-primary shadow-[0_1px_0_rgba(26,26,46,0.02)] outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:!outline-none focus-visible:!ring-0"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <CaretDown
        size={12}
        weight="bold"
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary"
      />
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
      className={`rounded-[14px] border border-border-subtle bg-white px-5 py-4 sm:px-6 sm:py-5 ${className ?? ""}`}
    >
      <h2 className="mb-2.5 font-heading text-[24px] font-medium text-text-primary">{title}</h2>
      {children}
    </div>
  );
}
