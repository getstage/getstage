export type ProjectModal =
  | "name"
  | "client"
  | "timeline"
  | "phases"
  | "workflow"
  | "skills"
  | "pause"
  | "complete"
  | "delete";

export type ProjectTimeline = {
  start: string;
  end: string;
};
