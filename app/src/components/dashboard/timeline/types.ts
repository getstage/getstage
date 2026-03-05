import type { Project } from "@/types";

export interface TimelineProps {
  projects: Project[];
  horizon?: TimelineHorizon;
  nowTimestamp?: number;
}

export type TimelineHorizon =
  | "today"
  | "yesterday"
  | "thisWeek"
  | "thisMonth"
  | "thisYear"
  | "30d"
  | "6m"
  | "12m"
  | "all";

export type CurveSample = {
  frac: number;
  h: number;
};

export type PositionedProject = {
  project: Project;
  pct: number;
};

export type MarkerGroup = {
  key: string;
  pct: number;
  curveTop: number;
  items: PositionedProject[];
};

export type TrackingState = {
  x: number;
  curveTop: number;
  dateFull: string;
  activeProjects: Project[];
  tipLeft: number;
  tipTop: number;
  tipWidth: number;
};

export type ProfileHoverState = {
  projectId: string;
  x: number;
  y: number;
  progress: number;
};
