import { cn } from "@/lib/utils";
import { CHART_HEIGHT, CHART_WIDTH, areaPath, chartScale, linePath } from "./chart-geometry";
import type { ChartPoint } from "./chart-geometry";

export function AreaChart({
  data,
  label,
  className,
}: {
  data: ChartPoint[];
  label: string;
  className?: string;
}) {
  const scale = chartScale(data);
  const gradientId = `area-${label.replaceAll(/[^a-zA-Z0-9]/g, "-").toLowerCase()}`;

  return (
    <svg
      viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
      preserveAspectRatio="none"
      className={cn("h-full w-full text-primary", className)}
      role="img"
      aria-label={label}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.28" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath(data, scale)} fill={`url(#${gradientId})`} />
      <path
        d={linePath(data, scale)}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <line
        x1={scale.bounds.left}
        y1={scale.baseline}
        x2={CHART_WIDTH - scale.bounds.right}
        y2={scale.baseline}
        stroke="currentColor"
        strokeOpacity="0.18"
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
