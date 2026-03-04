import type { Phase, Project, Task } from "@/types";

export type DashboardTaskEntry = {
  task: Task;
  phase: Phase;
  project: Project;
};

export type DashboardPaymentRow = {
  name: string;
  avatarUrl?: string;
  amount: number;
  status?: "paid" | "pending";
};

export type DashboardPaymentSummary = {
  rows: DashboardPaymentRow[];
  outstandingTotal: number;
  receivedTotal: number;
  pendingTotal: number;
} | null;
