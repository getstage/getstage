import { DashboardCard, CardTab } from "@/components/dashboard/DashboardCard";
import type { DashboardTaskEntry } from "@/components/dashboard/dashboardTypes";

type UpcomingTasksCardProps = {
  tasks: DashboardTaskEntry[];
};

function formatDueDate(dueDate: number | undefined): string {
  if (!dueDate) return "";
  const date = new Date(dueDate);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}

function getDueUrgency(dueDate: number | undefined): { color: string; label: string } {
  if (!dueDate) return { color: "text-[#737373]", label: "" };
  const now = Date.now();
  const diffMs = dueDate - now;
  const oneDayMs = 24 * 60 * 60 * 1000;

  if (diffMs < oneDayMs) return { color: "text-[#ef4444]", label: "Today" };
  if (diffMs < 2 * oneDayMs) return { color: "text-[#f97316]", label: "Tomorrow" };
  return { color: "text-[#16a34a]", label: formatDueDate(dueDate) };
}

export function UpcomingTasksCard({ tasks }: UpcomingTasksCardProps) {
  const totalDue = tasks.length;

  return (
    <DashboardCard
      className="h-full flex-1"
      title="Upcoming Deadlines"
      subtitle="Tasks requiring your attention soon"
      action={<CardTab label="This week" />}
    >
      {tasks.length > 0 ? (
        <>
          <div>
            {tasks.map((entry, index) => {
              const urgency = getDueUrgency(entry.task.dueDate);
              const dateStr = urgency.label || formatDueDate(entry.task.dueDate);

              return (
                <div
                  key={entry.task.id}
                  className={`flex items-center gap-2.5 py-2.5 ${
                    index > 0 ? "border-t border-[#f0f0f0]" : ""
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] text-[#0a0a0a]">
                      {entry.task.title}
                    </div>
                    <div className="text-[11px] text-[#737373]">
                      {entry.project.name}
                    </div>
                  </div>
                  {dateStr && (
                    <span className={`shrink-0 text-[12px] font-medium ${urgency.color}`}>
                      {dateStr}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          {totalDue > 0 && (
            <div className="mt-2.5 border-t border-[#f0f0f0] pt-2.5 text-[12px] font-normal text-[#737373]">
              {totalDue} task{totalDue !== 1 ? "s" : ""} due soon
            </div>
          )}
        </>
      ) : (
        <p className="text-[13px] text-[#737373]">No upcoming tasks.</p>
      )}
    </DashboardCard>
  );
}
