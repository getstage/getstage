import { DashboardCard, CardTab } from "./DashboardCard";
import type { DashboardPeriod } from "./DashboardHeader";
import type { DashboardTask } from "@/models/dashboard/dashboard";

function getDueUrgency(dueDate: number | undefined): { color: string; label: string } {
  if (!dueDate) return { color: "text-[#737373]", label: "" };
  const now = Date.now();
  const diffMs = dueDate - now;
  const oneDayMs = 24 * 60 * 60 * 1000;

  if (diffMs < 0) return { color: "text-[#ef4444]", label: "Overdue" };
  if (diffMs < oneDayMs) return { color: "text-[#ef4444]", label: "Due today" };
  if (diffMs < 2 * oneDayMs) return { color: "text-[#f97316]", label: "Due tomorrow" };
  const days = Math.ceil(diffMs / oneDayMs);
  return { color: "text-[#16a34a]", label: `Due in ${days} days` };
}

export function UpcomingTasksCard({
  tasks,
  period,
}: {
  tasks: DashboardTask[];
  period: DashboardPeriod;
}) {
  return (
    <DashboardCard
      className="h-full flex-1"
      title="Upcoming Deadlines"
      subtitle="Tasks requiring your attention soon"
      action={<CardTab label={period} />}
    >
      {tasks.length > 0 ? (
        <>
          <div className="flex w-full flex-col gap-[16px]">
            {tasks.map((task, index) => {
              const urgency = getDueUrgency(task.dueDate);

              return (
                <div key={task.id}>
                  {index > 0 && (
                    <div className="mb-[16px] h-px w-full bg-[#e5e5e5]" />
                  )}
                  <div className="flex items-start gap-[10px]">
                    {task.projectImageUrl ? (
                      <img
                        src={task.projectImageUrl}
                        alt=""
                        className="h-[28px] w-[28px] shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-full bg-[#e5e5e5] text-[11px] font-medium text-[#737373]">
                        {task.projectName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex min-w-0 flex-col gap-[4px]">
                      <p className="truncate text-[13px] font-medium leading-[1.2] text-[#0a0a0a]">
                        {task.title}
                      </p>
                      <div className="flex min-w-0 items-center gap-[8px]">
                        <span className="truncate text-[12px] font-medium leading-[1.5] text-[#737373]">
                          {task.projectName}
                        </span>
                        {urgency.label && (
                          <>
                            <span className="h-[4px] w-[4px] rounded-full bg-[#d4d4d4]" />
                            <span className={`text-[12px] font-medium leading-[1.5] ${urgency.color}`}>
                              {urgency.label}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-[12px] font-normal leading-[1.5] text-[#737373]">
            {tasks.length} task{tasks.length !== 1 ? "s" : ""} due soon
          </p>
        </>
      ) : (
        <p className="text-[13px] text-[#737373]">No upcoming tasks for {period.toLowerCase()}.</p>
      )}
    </DashboardCard>
  );
}
