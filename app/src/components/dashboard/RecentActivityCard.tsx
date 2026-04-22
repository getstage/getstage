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
      className="h-full"
      title="Recent Activity"
      subtitle="Latest updates across your projects"
      action={<CardTab label="This Month" />}
    >
      {entries.length > 0 ? (
        <>
          <div className="flex flex-col gap-4">
            {entries.map((entry, index) => {
              const actionLabel = entry.task.isCompleted ? "Completed" : "Updated";

              return (
                <div key={entry.task.id}>
                  {index > 0 && <div className="mb-4 h-px bg-border-subtle" />}
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium leading-[1.2] text-text-primary">
                      {actionLabel}: {entry.task.title}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-[12px] font-medium leading-[1.5] text-text-secondary">
                      <span>{entry.project.name}</span>
                      <span className="h-1 w-1 shrink-0 rounded-full bg-text-tertiary" />
                      <span>{getTimeAgo(entry.task.updatedAt)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-6 text-[12px] text-text-secondary">
            {entries.length} update{entries.length !== 1 ? "s" : ""} this month
          </div>
        </>
      ) : (
        <p className="text-[13px] text-text-secondary">No recent activity.</p>
      )}
    </DashboardCard>
  );
}
