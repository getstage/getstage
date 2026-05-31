import { DashboardCard, CardTab } from "./DashboardCard";
import type { DashboardPeriod } from "./DashboardHeader";
import { formatRelativeTime } from "@/lib/utils";
import type { DashboardTask } from "@/models/dashboard/dashboard";

export function RecentActivityCard({
  entries,
  period,
}: {
  entries: DashboardTask[];
  period: DashboardPeriod;
}) {
  return (
    <DashboardCard
      className="h-full flex-1"
      title="Recent Activity"
      subtitle="Latest updates across your projects"
      action={<CardTab label={period} />}
    >
      {entries.length > 0 ? (
        <>
          <div className="flex w-full flex-col gap-[16px]">
            {entries.map((entry, index) => {
              const actionLabel = entry.isCompleted ? "Completed" : "Updated";

              return (
                <div key={entry.id}>
                  {index > 0 && (
                    <div className="mb-[16px] h-px w-full bg-[#e5e5e5]" />
                  )}
                  <div className="flex min-w-0 flex-col gap-[4px]">
                    <p className="truncate text-[13px] font-medium leading-[1.2] text-[#0a0a0a]">
                      {actionLabel}: {entry.title}
                    </p>
                    <div className="flex min-w-0 items-center gap-[8px]">
                      <span className="truncate text-[12px] font-medium leading-[1.5] text-[#737373]">
                        {entry.projectName}
                      </span>
                      <span className="h-[4px] w-[4px] rounded-full bg-[#d4d4d4]" />
                      <span className="text-[12px] font-medium leading-[1.5] text-[#737373]">
                        {formatRelativeTime(entry.updatedAt)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-[12px] font-normal leading-[1.5] text-[#737373]">
            {entries.length} update{entries.length !== 1 ? "s" : ""} in {period.toLowerCase()}
          </p>
        </>
      ) : (
        <p className="text-[13px] text-[#737373]">No recent activity for {period.toLowerCase()}.</p>
      )}
    </DashboardCard>
  );
}
