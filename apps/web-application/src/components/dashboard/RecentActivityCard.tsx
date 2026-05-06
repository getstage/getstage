import { DashboardCard, CardTab } from "@/components/dashboard/DashboardCard";
import type { DashboardTaskEntry } from "@/components/dashboard/dashboardTypes";

type RecentActivityCardProps = {
  entries: DashboardTaskEntry[];
};

function getTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function RecentActivityCard({ entries }: RecentActivityCardProps) {
  return (
    <DashboardCard
      className="h-full flex-1"
      title="Recent Activity"
      subtitle="Latest updates across your projects"
      action={<CardTab label="This Month" />}
    >
      {entries.length > 0 ? (
        <>
          <div className="flex flex-col gap-[16px]">
            {entries.map((entry, index) => {
              const actionLabel = entry.task.isCompleted ? "Completed" : "Updated";

              return (
                <div key={entry.task.id}>
                  {index > 0 && (
                    <div className="mb-[16px] h-px w-full bg-[#e5e5e5]" />
                  )}
                  <div className="flex flex-col gap-[4px]">
                    <p className="text-[13px] font-medium leading-[1.2] text-[#0a0a0a]">
                      {actionLabel}: {entry.task.title}
                    </p>
                    <div className="flex items-center gap-[8px]">
                      <span className="text-[12px] font-medium leading-[1.5] text-[#737373]">
                        {entry.project.name}
                      </span>
                      <span className="h-[4px] w-[4px] rounded-full bg-[#d4d4d4]" />
                      <span className="text-[12px] font-medium leading-[1.5] text-[#737373]">
                        {getTimeAgo(entry.task.updatedAt)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-[24px] text-[12px] font-normal leading-[1.5] text-[#737373]">
            {entries.length} update{entries.length !== 1 ? "s" : ""} this month
          </p>
        </>
      ) : (
        <p className="text-[13px] text-[#737373]">No recent activity.</p>
      )}
    </DashboardCard>
  );
}
