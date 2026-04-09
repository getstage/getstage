import { DashboardCard, CardTab } from "@/components/dashboard/DashboardCard";
import type { DashboardTaskEntry } from "@/components/dashboard/dashboardTypes";

type RecentActivityCardProps = {
  entries: DashboardTaskEntry[];
};

function getActivityIcon(phaseName: string): {
  bg: string;
  stroke: string;
  path: string;
} {
  const lower = phaseName.toLowerCase();

  if (lower.includes("research") || lower.includes("discover")) {
    return {
      bg: "bg-[rgba(135,130,245,0.1)]",
      stroke: "#8782F5",
      path: "M7 7a4.5 4.5 0 1 0 0-0.01M10.5 10.5L14 14",
    };
  }

  if (lower.includes("strateg")) {
    return {
      bg: "bg-[rgba(59,130,246,0.1)]",
      stroke: "#3B82F6",
      path: "M3 3h10v10H3zM6 6h4M6 8.5h4M6 11h2.5",
    };
  }

  return {
    bg: "bg-[rgba(34,197,94,0.1)]",
    stroke: "#22C55E",
    path: "M8 2l1.5 3.5L13 7l-3 2.5L11 13l-3-2-3 2 1-3.5L3 7l3.5-1.5z",
  };
}

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
      action={<CardTab label="This month" />}
    >
      {entries.length > 0 ? (
        <>
          <div>
            {entries.map((entry, index) => {
              const actionLabel = entry.task.isCompleted ? "Completed" : "Updated";
              const icon = getActivityIcon(entry.phase.name);

              return (
                <div
                  key={entry.task.id}
                  className={`flex items-center gap-3 py-2.5 ${
                    index > 0 ? "border-t border-border-subtle" : ""
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${icon.bg}`}
                  >
                    <svg
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke={icon.stroke}
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-4 w-4"
                    >
                      <path d={icon.path} />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] text-text-primary">
                      {actionLabel}: {entry.task.title}
                    </div>
                    <div className="mt-px text-[12px] text-text-secondary">
                      {entry.project.name}
                    </div>
                  </div>
                  <span className="shrink-0 text-[11px] text-text-tertiary">
                    {getTimeAgo(entry.task.updatedAt)}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-1.5 flex items-center gap-2 border-t border-border-subtle pt-3.5">
            <span className="font-heading text-[20px] font-semibold tracking-[-0.5px] text-accent">
              {entries.length}
            </span>
            <span className="text-[12px] text-text-secondary">
              updates this month
            </span>
          </div>
        </>
      ) : (
        <p className="text-[13px] text-text-secondary">No recent activity.</p>
      )}
    </DashboardCard>
  );
}
