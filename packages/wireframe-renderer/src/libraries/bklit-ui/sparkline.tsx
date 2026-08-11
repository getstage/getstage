import { cn } from "@/lib/utils";
import { CHART_HEIGHT, CHART_WIDTH, chartScale, linePath } from "./chart-geometry";
import type { ChartPoint } from "./chart-geometry";

const SPARK_BOUNDS = { top: 6, right: 2, bottom: 6, left: 2 };

export function Sparkline({
  data,
  label,
  className,
}: {
  data: ChartPoint[];
  label: string;
  className?: string;
}) {
  const scale = chartScale(data, SPARK_BOUNDS);

  return (
    <svg
      viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
      preserveAspectRatio="none"
      className={cn("h-8 w-full", className)}
      role="img"
      aria-label={label}
    >
      <path
        d={linePath(data, scale)}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
