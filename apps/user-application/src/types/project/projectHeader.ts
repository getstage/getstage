export type ProjectModal =
  | "name"
  | "client"
  | "timeline"
  | "phases"
  | "workflow"
  | "pause"
  | "complete"
  | "delete";

export type ProjectTimeline = {
  start: string;
  end: string;
};
