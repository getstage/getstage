import { CardTab, DashboardCard } from "./DashboardCard";
import type { DashboardRevenue } from "../models/dashboard";

export function RevenueOverviewCard({
  revenue,
}: {
  revenue: DashboardRevenue;
}) {
  return (
    <DashboardCard
      className="h-full flex-1 self-stretch"
      title="Revenue Overview"
      subtitle="Track outstanding and received payments"
      action={<CardTab label="This Month" />}
    >
      <div className="flex min-h-0 w-full flex-1 flex-col items-start">
        <div className="grid w-full grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-[16px]">
          <RevenueMetric
            value={revenue.outstanding}
            label="Outstanding"
            icon="/logos/dashboard/flag.svg"
          />
          <RevenueMetric
            value={revenue.received}
            label="Received"
            icon="/logos/dashboard/arrow.svg"
            labelClassName="text-[#16a34a]"
          />
        </div>
      </div>
      <p className="text-[12px] font-normal leading-[1.5] text-[#737373]">
        {revenue.note}
      </p>
    </DashboardCard>
  );
}

function RevenueMetric({
  value,
  label,
  icon,
  labelClassName = "text-[#737373]",
}: {
  value: string;
  label: string;
  icon: string;
  labelClassName?: string;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-start gap-[6px]">
      <p className="text-[18px] font-medium leading-[1.2] tracking-[-0.18px] text-[#0a0a0a]">
        {value}
      </p>
      <div className="flex min-w-0 items-center gap-[6px]">
        <img src={icon} alt="" aria-hidden="true" className="h-[13px] w-[13px]" />
        <p className={`truncate text-[12px] font-medium leading-[1.5] ${labelClassName}`}>
          {label}
        </p>
      </div>
    </div>
  );
}
