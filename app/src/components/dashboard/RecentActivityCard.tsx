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
      action={<CardTab label="This month" />}
    >
      {entries.length > 0 ? (
        <>
          <div>
            {entries.map((entry, index) => {
              const actionLabel = entry.task.isCompleted ? "Completed" : "Updated";

              return (
                <div
                  key={entry.task.id}
                  className={`flex items-center gap-3 py-2.5 ${
                    index > 0 ? "border-t border-[#f0f0f0]" : ""
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] text-[#0a0a0a]">
                      {actionLabel}: {entry.task.title}
                    </div>
                    <div className="mt-px text-[12px] text-[#737373]">
                      {entry.project.name}
                    </div>
                  </div>
                  <span className="shrink-0 text-[11px] text-[#a3a3a3]">
                    {getTimeAgo(entry.task.updatedAt)}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-2.5 border-t border-[#f0f0f0] pt-2.5 text-[12px] font-normal text-[#737373]">
            {entries.length} update{entries.length !== 1 ? "s" : ""} this month
          </div>
        </>
      ) : (
        <p className="text-[13px] text-[#737373]">No recent activity.</p>
      )}
    </DashboardCard>
  );
}
