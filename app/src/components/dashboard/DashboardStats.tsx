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
    <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
      <StatCard
        label="Active Projects"
        value={activeProjects.toLocaleString()}
        icon={<ActiveProjectsIcon />}
      />
      <StatCard
        label="Tasks Due"
        value={tasksDue.toLocaleString()}
        icon={<TasksDueIcon />}
      />
      <StatCard
        label="Completed"
        value={completed.toLocaleString()}
        icon={<CompletedIcon />}
      />
      <StatCard
        label="Avg. Process"
        value={`${avgProgress}%`}
        icon={<AvgProcessIcon />}
      />
    </div>
  );
}

type StatCardProps = {
  label: string;
  value: string;
  icon: React.ReactNode;
};

function StatCard({ label, value, icon }: StatCardProps) {
  return (
    <div className="flex flex-col gap-7 rounded-[8px] bg-input-bg p-4 shadow-[0px_0.45px_1px_0px_rgba(10,10,10,0.25)]">
      <div className="h-[18px] w-[18px] text-text-secondary">{icon}</div>
      <div>
        <div className="text-[20px] font-semibold leading-[1.2] tracking-[-0.2px] text-text-primary">
          {value}
        </div>
        <div className="mt-1 text-[12px] font-medium leading-[1.5] text-text-secondary">
          {label}
        </div>
      </div>
    </div>
  );
}

function ActiveProjectsIcon() {
  return (
    <svg viewBox="0 0 18 18" fill="none" className="h-full w-full">
      <path
        d="M9 3C7.34 3 6 4.34 6 6s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <path
        d="M3.5 9a5.5 5.5 0 0 0 11 0"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeDasharray="2 2"
      />
      <circle cx="9" cy="9" r="2" fill="currentColor" opacity="0.3" />
    </svg>
  );
}

function TasksDueIcon() {
  return (
    <svg viewBox="0 0 18 18" fill="none" className="h-full w-full">
      <rect
        x="3"
        y="3"
        width="12"
        height="12"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <path
        d="M6 7h6M6 10h4"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CompletedIcon() {
  return (
    <svg viewBox="0 0 18 18" fill="none" className="h-full w-full">
      <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.2" />
      <path
        d="M6.5 9l1.75 1.75L11.5 7.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AvgProcessIcon() {
  return (
    <svg viewBox="0 0 18 18" fill="none" className="h-full w-full">
      <path
        d="M4 9h10M9 4v10M6.5 6.5l5 5M11.5 6.5l-5 5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}
