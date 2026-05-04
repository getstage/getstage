import type { DashboardMetric } from "../models/dashboard";

export function MetricGrid({ metrics }: { metrics: DashboardMetric[] }) {
  return (
    <div className="grid grid-cols-2 gap-[8px] sm:grid-cols-4">
      {metrics.map((metric) => (
        <StatCard
          key={metric.id}
          icon={metric.icon}
          value={metric.value}
          label={metric.label}
        />
      ))}
    </div>
  );
}

function StatCard({
  icon,
  value,
  label,
}: {
  icon: string;
  value: string;
  label: string;
}) {
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
