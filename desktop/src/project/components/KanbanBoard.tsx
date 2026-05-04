import { useMemo } from "react";
import type { Phase, Task } from "../models/project";

type KanbanStatus = "backlog" | "todo" | "in-progress" | "done";

const COLUMNS: { key: KanbanStatus; label: string }[] = [
  { key: "backlog", label: "Backlog" },
  { key: "todo", label: "To-do" },
  { key: "in-progress", label: "In-progress" },
  { key: "done", label: "Done" },
];

const PHASE_TAG_COLORS: Record<string, { bg: string; text: string }> = {
  Research: { bg: "bg-[#FDECEC]", text: "text-[#D64545]" },
  Strategy: { bg: "bg-[#FEF3E2]", text: "text-[#D4890A]" },
  Identity: { bg: "bg-[#EAF4FC]", text: "text-[#2E7DB5]" },
  Guidelines: { bg: "bg-[#EDFCF2]", text: "text-[#22C55E]" },
  Design: { bg: "bg-[#F3EEFF]", text: "text-[#7C3AED]" },
  Development: { bg: "bg-[#EAF4FC]", text: "text-[#2E7DB5]" },
  Delivery: { bg: "bg-[#F5F5F5]", text: "text-[#525252]" },
  Launch: { bg: "bg-[#EDFCF2]", text: "text-[#22C55E]" },
  Testing: { bg: "bg-[#FEF3E2]", text: "text-[#D4890A]" },
  Discovery: { bg: "bg-[#FEF3E2]", text: "text-[#D4890A]" },
};

const DEFAULT_TAG_COLOR = { bg: "bg-[#F5F5F5]", text: "text-[#525252]" };

function getTaskStatus(task: Task, phaseStatus: string): KanbanStatus {
  if (task.isCompleted) return "done";
  if (phaseStatus === "upcoming") return "backlog";
  if (phaseStatus === "active") return "in-progress";
  return "todo";
}

export function KanbanBoard({ phases }: { phases: Phase[] }) {
  const columns = useMemo(() => {
    const grouped: Record<KanbanStatus, { task: Task; phaseName: string }[]> = {
      backlog: [],
      todo: [],
      "in-progress": [],
      done: [],
    };

    for (const phase of phases) {
      for (const task of phase.tasks) {
        const status = getTaskStatus(task, phase.status);
        grouped[status].push({ task, phaseName: phase.name });
      }
    }

    return grouped;
  }, [phases]);

  return (
    <div className="grid grid-cols-1 gap-4 rounded-[10px] bg-[#F5F5F5] p-4 sm:grid-cols-2 lg:grid-cols-4">
      {COLUMNS.map((col) => (
        <div key={col.key} className="flex flex-col">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[13px] font-semibold text-[#171717]">{col.label}</h3>
            <button
              type="button"
              className="flex h-5 w-5 items-center justify-center rounded text-text-tertiary transition-colors hover:bg-bg-subtle hover:text-text-primary"
            >
              <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-3 w-3">
                <path d="M6 2v8M2 6h8" />
              </svg>
            </button>
          </div>
          <div className="flex flex-col gap-2.5">
            {columns[col.key].map(({ task, phaseName }) => {
              const tagColor = PHASE_TAG_COLORS[phaseName] ?? DEFAULT_TAG_COLOR;
              return (
                <div
                  key={task.id}
                  className="rounded-[8px] bg-gradient-to-b from-white to-[#FAFAFA] p-3 shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] transition-shadow hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
                >
                  <span className={`mb-2 inline-block rounded-[4px] px-1.5 py-0.5 text-[10px] font-semibold ${tagColor.bg} ${tagColor.text}`}>
                    {phaseName}
                  </span>
                  <div className="flex items-start gap-2">
                    <div
                      className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                        task.isCompleted
                          ? "border-[#171717] bg-[#171717] text-white"
                          : "border-transparent bg-[#D9D9D9]"
                      }`}
                    >
                      {task.isCompleted ? (
                        <svg viewBox="0 0 12 12" fill="none" className="h-2.5 w-2.5">
                          <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-[13px] font-medium leading-[1.35] ${task.isCompleted ? "text-text-tertiary line-through" : "text-text-primary"}`}>
                        {task.title}
                      </p>
                      <p className="mt-1 line-clamp-2 text-[12px] leading-[1.5] text-text-tertiary">
                        {task.content || "Here comes the project/task description, can contain 2-3 lines at max."}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
            {columns[col.key].length === 0 && (
              <div className="rounded-[8px] bg-white/50 p-4 text-center text-[12px] text-text-tertiary">
                No tasks
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
