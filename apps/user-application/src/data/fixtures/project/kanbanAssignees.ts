export const KANBAN_ASSIGNEES = [
  { name: "Pratik Singh", initials: "P", bg: "#E5E5E5", color: "#221E6C", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop" },
  { name: "John Doe", initials: "J", bg: "#DCFCE7", color: "#052E16", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop" },
  { name: "Mark Zuck", initials: "M", bg: "#F3E8FF", color: "#3B0764", avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop" },
] as const;

export type KanbanAssignee = (typeof KANBAN_ASSIGNEES)[number];
