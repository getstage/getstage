import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Check, Plus } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import { getProjects } from "@/data-ops/queries";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import {
  Timeline,
  type TimelineHorizon,
} from "@/components/dashboard/Timeline";

const DAY_MS = 24 * 60 * 60 * 1000;

export function DashboardPage() {
  const [hoveredDockId, setHoveredDockId] = useState<string | null>(null);
  const [timelineHorizon, setTimelineHorizon] = useState<TimelineHorizon>("all");
  const { user } = useAuth();
  const { data: projects, isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: getProjects,
  });

  const greeting = getGreeting(user?.name?.split(" ")[0] ?? "there");
  const activeProjects = projects?.filter((p) => p.status === "active") ?? [];
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
  const avgDurationDays =
    projects && projects.length > 0
      ? Math.round(
          projects.reduce((acc, project) => {
            const durationDays = Math.max(
              1,
              Math.ceil((project.endDate - project.startDate) / DAY_MS),
            );
            return acc + durationDays;
          }, 0) / projects.length,
        )
      : 0;
  const upcomingTasks = taskEntries
    .filter((entry) => !entry.task.isCompleted)
    .sort((a, b) => a.task.createdAt - b.task.createdAt)
    .slice(0, 3);
  const recentActivity = taskEntries
    .filter((entry) => entry.task.isCompleted)
    .sort((a, b) => b.task.updatedAt - a.task.updatedAt)
    .slice(0, 3);
  const paymentRows = activeProjects
    .slice(0, 3)
    .map((project, index) => ({
      name: project.clientName,
      avatarUrl: project.clientAvatarUrl,
      amount: 4500 - index * 1300,
    }));
  const dockProjects = (projects ?? []).slice(0, 6);

  return (
    <>
      <Helmet>
        <title>Dashboard — Stage</title>
      </Helmet>

      <div className="min-h-[calc(100vh-64px)]">
        <div className="mx-auto max-w-[1200px] px-6 pt-8 sm:px-10 lg:px-14">
          <div className="mb-6 flex items-end justify-between gap-4">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <h1 className="font-heading text-[32px] font-semibold tracking-tight text-text-primary">
                {greeting}
              </h1>
            </motion.div>
            <Link to="/new-project">
              <Button>
                <Plus size={14} weight="bold" aria-hidden="true" />
                New Project
              </Button>
            </Link>
          </div>

          <div className="mb-11 flex flex-wrap items-end justify-between gap-x-5 gap-y-3">
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
              <CompactStat
                label="Active"
                value={activeCount.toLocaleString()}
              />
              <CompactStat
                label="Tasks Due"
                value={tasksDue.toLocaleString()}
              />
              <CompactStat
                label="Completed"
                value={completed.toLocaleString()}
              />
              <CompactStat
                label="Avg Duration"
                value={`${avgDurationDays}d`}
              />
            </div>

            <TimelineHorizonSwitch
              value={timelineHorizon}
              onChange={setTimelineHorizon}
            />
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
            <div className="mt-10 grid gap-4 md:grid-cols-2">
              <InfoCard title="Upcoming">
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
                      <span className="flex-1 text-text-primary">{entry.task.title}</span>
                      <span className="rounded-full bg-bg-subtle px-2 py-0.5 text-[11px] text-text-secondary">
                        {entry.phase.name}
                      </span>
                    </div>
                  ))}
                </div>
              </InfoCard>

              <InfoCard title="Recent Activity">
                <div className="space-y-0">
                  {recentActivity.map((entry, index) => (
                    <div
                      key={entry.task.id}
                      className={`py-2 text-[13px] ${
                        index > 0 ? "border-t border-border-subtle" : ""
                      }`}
                    >
                      <span className="text-text-secondary">Completed: </span>
                      <span className="text-text-primary">{entry.task.title}</span>
                      <span className="text-text-tertiary"> — {entry.project.clientName}</span>
                    </div>
                  ))}
                </div>
              </InfoCard>
            </div>

            <InfoCard className="mt-4 px-7 py-6" title="Payments">
              <div className="grid gap-5 lg:grid-cols-[auto_1px_minmax(220px,1fr)_auto] lg:items-start">
                <div className="flex gap-10 sm:gap-14">
                  <div>
                    <div className="text-[12px] text-text-secondary">Outstanding</div>
                    <div className="font-heading text-[46px] font-semibold tracking-tight text-text-primary">
                      $6,200
                    </div>
                  </div>
                  <div>
                    <div className="text-[12px] text-text-secondary">Received</div>
                    <div className="font-heading text-[46px] font-semibold tracking-tight text-accent">
                      $12,400
                    </div>
                  </div>
                </div>

                <div className="hidden h-[112px] w-px bg-border-subtle lg:block" />

                <div className="space-y-2.5 pt-1">
                  {paymentRows.map((row) => (
                    <div key={row.name} className="flex items-center gap-2.5 text-[14px]">
                      <div className="h-5 w-5 overflow-hidden rounded-full bg-input-bg">
                        {row.avatarUrl ? (
                          <img
                            src={row.avatarUrl}
                            alt={row.name}
                            className="h-full w-full object-cover"
                          />
                        ) : null}
                      </div>
                      <span className="text-text-primary">{row.name}</span>
                    </div>
                  ))}
                </div>

                <div className="flex h-full min-h-[112px] flex-col items-end justify-between pt-1">
                  <div className="space-y-2.5 text-right">
                    {paymentRows.map((row) => (
                      <div
                        key={`${row.name}-amount`}
                        className="inline-flex items-center gap-1.5 text-[14px] font-medium text-accent"
                      >
                        <Check size={12} weight="bold" aria-hidden="true" />
                        {formatThousandsDot(row.amount)}
                      </div>
                    ))}
                  </div>
                  <div className="text-[13px] text-text-secondary">Pending $6,200</div>
                </div>
              </div>
            </InfoCard>

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
                  onMouseLeave={() => setHoveredDockId((current) => (current === project.id ? null : current))}
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
                    onBlur={() => setHoveredDockId((current) => (current === project.id ? null : current))}
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

function formatThousandsDot(value: number) {
  return `$${value.toLocaleString("de-DE")}`;
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
    <div className="min-w-[84px]">
      <div className="text-[11px] text-text-secondary">{label}</div>
      <div className="mt-0.5 font-heading text-[28px] leading-none font-semibold tracking-tight text-text-primary">
        {value}
      </div>
    </div>
  );
}

function TimelineHorizonSwitch({
  value,
  onChange,
}: {
  value: TimelineHorizon;
  onChange: (value: TimelineHorizon) => void;
}) {
  const options: Array<{ value: TimelineHorizon; label: string }> = [
    { value: "30d", label: "30D" },
    { value: "90d", label: "90D" },
    { value: "6m", label: "6M" },
    { value: "all", label: "All" },
  ];

  return (
    <div className="inline-flex flex-wrap items-center gap-2">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`h-10 rounded-full px-4 text-[14px] font-medium transition-colors ${
            value === option.value
              ? "bg-accent text-white"
              : "bg-border-subtle text-text-primary hover:bg-border"
          }`}
        >
          {option.label}
        </button>
      ))}
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
      className={`rounded-[12px] border border-border-subtle bg-white p-4 ${className ?? ""}`}
    >
      <h2 className="mb-2 text-[19px] font-heading font-semibold text-text-primary">{title}</h2>
      {children}
    </div>
  );
}
