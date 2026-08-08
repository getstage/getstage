/// Every coordinate here is derived from the data alone. The renderer runs under
/// `renderToStaticMarkup`, where there is no layout pass — anything that measures a DOM
/// node (visx `ParentSize`, Recharts `ResponsiveContainer`) resolves to 0x0 and draws
/// nothing, so the charts are sized by a fixed viewBox and scaled by CSS instead.

export type ChartPoint = { label: string; value: number };

export const CHART_WIDTH = 320;
export const CHART_HEIGHT = 160;

export type ChartBounds = { top: number; right: number; bottom: number; left: number };

export const DEFAULT_BOUNDS: ChartBounds = { top: 10, right: 10, bottom: 22, left: 10 };

export type ChartScale = {
  innerWidth: number;
  innerHeight: number;
  baseline: number;
  bounds: ChartBounds;
  bandWidth: number;
  x: (index: number) => number;
  y: (value: number) => number;
};

export function chartScale(data: ChartPoint[], bounds: ChartBounds = DEFAULT_BOUNDS): ChartScale {
  const innerWidth = CHART_WIDTH - bounds.left - bounds.right;
  const innerHeight = CHART_HEIGHT - bounds.top - bounds.bottom;
  const values = data.map((point) => point.value);
  const max = Math.max(0, ...values);
  const min = Math.min(0, ...values);
  const span = max - min || 1;
  const step = data.length > 1 ? innerWidth / (data.length - 1) : 0;

  return {
    innerWidth,
    innerHeight,
    baseline: bounds.top + innerHeight,
    bounds,
    bandWidth: innerWidth / Math.max(data.length, 1),
    x: (index) => bounds.left + (data.length > 1 ? index * step : innerWidth / 2),
    y: (value) => bounds.top + innerHeight - ((value - min) / span) * innerHeight,
  };
}

export function linePath(data: ChartPoint[], scale: ChartScale) {
  return data
    .map((point, index) => `${index === 0 ? "M" : "L"}${scale.x(index)} ${scale.y(point.value)}`)
    .join(" ");
}

export function areaPath(data: ChartPoint[], scale: ChartScale) {
  if (data.length === 0) return "";
  const last = data.length - 1;
  return `${linePath(data, scale)} L${scale.x(last)} ${scale.baseline} L${scale.x(0)} ${scale.baseline} Z`;
}

/// Series read as one brand-tinted family rather than an arbitrary palette, so a chart
/// and its legend stay consistent with whatever brand color the screen sets.
export function seriesOpacity(index: number, total: number) {
  return 1 - (index / Math.max(total, 1)) * 0.65;
}

/// Donut segments. SVG arcs cannot express a full turn, so a lone 100% segment is drawn
/// just shy of closing rather than collapsing to a point.
export function arcPath(
  cx: number,
  cy: number,
  outerRadius: number,
  innerRadius: number,
  startTurn: number,
  endTurn: number,
) {
  const turn = Math.min(endTurn - startTurn, 0.9999);
  const start = (startTurn - 0.25) * Math.PI * 2;
  const end = (startTurn + turn - 0.25) * Math.PI * 2;
  const largeArc = turn > 0.5 ? 1 : 0;
  const outer = {
    x1: cx + outerRadius * Math.cos(start),
    y1: cy + outerRadius * Math.sin(start),
    x2: cx + outerRadius * Math.cos(end),
    y2: cy + outerRadius * Math.sin(end),
  };
  const inner = {
    x1: cx + innerRadius * Math.cos(end),
    y1: cy + innerRadius * Math.sin(end),
    x2: cx + innerRadius * Math.cos(start),
    y2: cy + innerRadius * Math.sin(start),
  };

  return [
    `M${outer.x1} ${outer.y1}`,
    `A${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${outer.x2} ${outer.y2}`,
    `L${inner.x1} ${inner.y1}`,
    `A${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${inner.x2} ${inner.y2}`,
    "Z",
  ].join(" ");
}
