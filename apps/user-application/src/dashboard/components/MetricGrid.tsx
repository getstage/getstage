import type { DashboardMetric } from "../models/dashboard";
import { cn } from "@/lib/utils";
import { surfaceStyles, textStyles } from "@/styles/recipes";

export function MetricGrid({ metrics }: { metrics: DashboardMetric[] }) {
  return (
    <div className="overflow-hidden rounded-[10px] bg-input-bg p-[2px]">
      <div className="grid grid-cols-2 gap-[2px] xl:grid-cols-4">
        {metrics.map((metric) => (
          <StatCard
            key={metric.id}
            icon={metric.icon}
            value={metric.value}
            label={metric.label}
          />
        ))}
      </div>
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
    <div className={cn("flex min-w-0 flex-col items-start gap-[clamp(16px,3vw,28px)] p-4", surfaceStyles.elevatedCard)}>
      <img src={icon} alt="" aria-hidden="true" className="h-[18px] w-[18px]" />
      <div className="flex min-w-0 flex-col items-start gap-[4px]">
        <div className="text-[20px] font-semibold leading-[1.2] tracking-[-0.2px] text-ink">
          {value}
        </div>
        <div className={cn(textStyles.caption, "truncate")}>
          {label}
        </div>
      </div>
    </div>
  );
}
