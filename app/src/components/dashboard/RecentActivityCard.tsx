import { DashboardCard } from "@/components/dashboard/DashboardCard";
import type { DashboardTaskEntry } from "@/components/dashboard/dashboardTypes";

type RecentActivityCardProps = {
  entries: DashboardTaskEntry[];
};

export function RecentActivityCard({ entries }: RecentActivityCardProps) {
  return (
    <DashboardCard className="h-full" title="Recent Activity">
      {entries.length > 0 ? (
        <div className="space-y-0">
          {entries.map((entry, index) => {
            const actionLabel = entry.task.isCompleted ? "Completed" : "Added";

            return (
              <div
                key={entry.task.id}
                className={`py-1.5 text-[13px] leading-[1.45] ${
                  index > 0 ? "border-t border-border-subtle" : ""
                }`}
              >
                <span className="text-text-secondary">{actionLabel}: </span>
                <span className="font-medium text-text-primary">{entry.task.title}</span>
                <span className="text-text-secondary"> — {entry.project.clientName}</span>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-[13px] text-text-secondary">No recent activity.</p>
      )}
    </DashboardCard>
  );
}
