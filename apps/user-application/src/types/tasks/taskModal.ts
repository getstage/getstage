export type TaskAssignee = {
  name: string;
  avatarUrl: string;
};

export type TaskProject = {
  name: string;
  logoUrl: string;
};

export type TaskPicker = "assignee" | "project" | null;
