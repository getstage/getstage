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
    <div>
      <div className="flex gap-[8px]">
        <StatCard
          icon="/logos/dashboard/radio.svg"
          value={activeProjects.toLocaleString()}
          label="Active Projects"
        />
        <StatCard
          icon="/logos/dashboard/flag.svg"
          value={tasksDue.toLocaleString()}
          label="Tasks Due"
        />
        <StatCard
          icon="/logos/dashboard/check.svg"
          value={completed.toLocaleString()}
          label="Completed"
        />
        <StatCard
          icon="/logos/dashboard/calculator.svg"
          value={`${avgProgress}%`}
          label="Avg. Process"
        />
      </div>
    </div>
  );
}

type StatCardProps = {
  icon: string;
  value: string;
  label: string;
};

function StatCard({ icon, value, label }: StatCardProps) {
  return (
    <div className="flex flex-1 flex-col gap-[28px] rounded-[8px] bg-[#f5f5f5] p-[16px] shadow-[0px_0.45px_1px_0px_rgba(10,10,10,0.25)]">
      <img src={icon} alt="" aria-hidden="true" className="h-[18px] w-[18px]" />
      <div>
        <div className="text-[20px] font-semibold leading-[1.2] tracking-[-0.2px] text-[#0a0a0a]">
          {value}
        </div>
        <div className="text-[12px] font-medium leading-[1.5] text-[#737373]">
          {label}
        </div>
      </div>
    </div>
  );
}
