type DashboardStatsProps = {
  activeProjects: number;
  tasksDue: number;
  completed: number;
  avgProgress: number;
};

export function DashboardStats({
  activeProjects,
  tasksDue,
  completed,
  avgProgress,
}: DashboardStatsProps) {
  return (
    <div className="mt-5 flex flex-wrap items-start gap-x-12 gap-y-3">
      <StatItem label="Active Projects" value={activeProjects.toLocaleString()} />
      <StatItem label="Tasks Due" value={tasksDue.toLocaleString()} />
      <StatItem label="Completed" value={completed.toLocaleString()} />
      <StatItem label="Avg. Progress" value={`${avgProgress}%`} />
    </div>
  );
}

type StatItemProps = {
  label: string;
  value: string;
};

function StatItem({ label, value }: StatItemProps) {
  return (
    <div className="min-w-[86px]">
      <div className="text-[13px] text-text-secondary">{label}</div>
      <div className="mt-0.5 font-heading text-[26px] leading-[1.15] font-semibold tracking-[-0.5px] tabular-nums text-text-primary">
        {value}
      </div>
    </div>
  );
}
