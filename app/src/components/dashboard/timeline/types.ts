import type { Project } from "@/types";

export interface TimelineProps {
  projects: Project[];
  horizon?: TimelineHorizon;
  nowTimestamp?: number;
  interactive?: boolean;
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

export type BarSegment = {
  bucketStart: number;
  bucketEnd: number;
  count: number;
  height: number;
  x: number;
  width: number;
};

export type DateLabel = {
  label: string;
  x: number;
};

export type CurveSample = {
  frac: number;
  h: number;
};

export type PositionedProject = {
  key: string;
  project: Project;
  pct: number;
  markerTimestamp: number;
};

export type MarkerGroup = {
  key: string;
  pct: number;
  barTop: number;
  items: PositionedProject[];
};

export type TimelineTrackingState = {
  x: number;
  barTop: number;
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

export type ProfileHoverDetails = {
  tooltipDateRange: string;
  projectName: string;
  clientName: string;
  phaseName: string;
  tasks: Array<Project["phases"][number]["tasks"][number] & { isRecentlyAdded: boolean }>;
  overflowCount: number;
  left: number;
  top: number;
  width: number;
  arrowLeft: number;
};

export type TimelineLayout = {
  width: number;
  start: number;
  end: number;
  rangeMs: number;
  bars: BarSegment[];
  maxCount: number;
  dateLabels: DateLabel[];
  visibleProjects: Project[];
  groups: MarkerGroup[];
  edgeInset: number;
};

export type TrackingState = TimelineTrackingState;
