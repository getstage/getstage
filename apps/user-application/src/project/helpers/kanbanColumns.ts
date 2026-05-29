import type { Phase, Task } from "../models/project";

export type KanbanStatus = "backlog" | "todo" | "in-progress" | "done";

export const KANBAN_COLUMNS: { key: KanbanStatus; label: string }[] = [
  { key: "backlog", label: "Backlog" },
  { key: "todo", label: "To-do" },
  { key: "in-progress", label: "In-progress" },
  { key: "done", label: "Done" },
];

export const PHASE_TAG_COLORS: Record<string, { bg: string; text: string }> = {
  Research: { bg: "bg-[#DCFCE7]", text: "text-[#052E16]" },
  Strategy: { bg: "bg-[#CFFAFE]", text: "text-[#083344]" },
  Identity: { bg: "bg-[#DBEAFE]", text: "text-[#172554]" },
  Guidelines: { bg: "bg-[#F3E8FF]", text: "text-[#3B0764]" },
  Design: { bg: "bg-[#F3E8FF]", text: "text-[#3B0764]" },
  Development: { bg: "bg-[#DBEAFE]", text: "text-[#172554]" },
  Delivery: { bg: "bg-[#F5F5F5]", text: "text-[#525252]" },
  Launch: { bg: "bg-[#DCFCE7]", text: "text-[#052E16]" },
  Testing: { bg: "bg-[#CFFAFE]", text: "text-[#083344]" },
  Discovery: { bg: "bg-[#CFFAFE]", text: "text-[#083344]" },
};

export const DEFAULT_PHASE_TAG_COLOR = { bg: "bg-[#F5F5F5]", text: "text-[#525252]" };

export type BoardTask = { task: Task; phaseName: string };

export function getTaskStatus(task: Task, phaseStatus: string): KanbanStatus {
  if (task.status) return task.status;
  if (task.isCompleted) return "done";
  if (phaseStatus === "upcoming") return "backlog";
  if (phaseStatus === "active") return "in-progress";
  return "todo";
}

export function buildKanbanColumns(phases: Phase[]): Record<KanbanStatus, BoardTask[]> {
  const grouped: Record<KanbanStatus, BoardTask[]> = {
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
}
