export const DAY_MS = 24 * 60 * 60 * 1000;
export const CHART_HEIGHT = 160;
export const CHART_BOTTOM_PADDING = 28;
export const BAR_MAX_HEIGHT = CHART_HEIGHT - CHART_BOTTOM_PADDING;
export const BAR_GAP = 2;
export const BAR_RADIUS = 4;
export const MARKER_SIZE = 36;
export const MARKER_RADIUS = MARKER_SIZE / 2;
export const MARKER_EDGE_INSET = MARKER_RADIUS + 4;
export const TOOLTIP_WIDTH = 286;
export const TRACKING_TOOLTIP_WIDTH = 220;
export const TOOLTIP_ARROW_INSET = 16;
export const RECENT_TASK_WINDOW_MS = 48 * 60 * 60 * 1000;

export const SHORT_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

export const FULL_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export const DATE_LABEL_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});
