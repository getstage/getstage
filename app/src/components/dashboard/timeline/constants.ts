export const DAY_MS = 24 * 60 * 60 * 1000;
export const CURVE_HEIGHT = 160;
export const CURVE_BASELINE_INSET = 4;
export const MARKER_SIZE = 36;
export const MARKER_RADIUS = MARKER_SIZE / 2;
export const MARKER_EDGE_INSET = MARKER_RADIUS + 4;
export const MAX_ELEVATION = 75;
export const SAMPLES = 120;
export const KERNEL = 0.025;
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

export const SKELETON_VIEWBOX_WIDTH = 1200;
export const SKELETON_CURVE_PATH =
  "M 0 140 C 72 132, 112 118, 168 118 C 284 118, 332 131, 418 124 C 500 118, 548 96, 640 100 C 724 103, 760 128, 838 116 C 902 106, 944 128, 1020 126 C 1098 124, 1144 138, 1200 136";
export const SKELETON_FILL_PATH = `${SKELETON_CURVE_PATH} L 1200 160 L 0 160 Z`;
