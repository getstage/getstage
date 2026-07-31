export type ProjectModal =
  | "name"
  | "client"
  | "timeline"
  | "phases"
  | "skills"
  | "pause"
  | "complete"
  | "delete";

export type ProjectTimeline = {
  start: string;
  end: string;
};
