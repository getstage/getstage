import { cn } from "@/lib/utils";
import { CHART_HEIGHT, CHART_WIDTH, chartScale, linePath } from "./chart-geometry";
import type { ChartPoint } from "./chart-geometry";

export function LineChart({
  data,
  label,
  showPoints = true,
  className,
}: {
  data: ChartPoint[];
  label: string;
  showPoints?: boolean;
  className?: string;
}) {
  const scale = chartScale(data);

  return (
    <svg
      viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
      className={cn("h-full w-full text-primary", className)}
      role="img"
      aria-label={label}
    >
      {[0.25, 0.5, 0.75].map((fraction) => (
        <line
          key={fraction}
          x1={scale.bounds.left}
          y1={scale.bounds.top + scale.innerHeight * fraction}
          x2={CHART_WIDTH - scale.bounds.right}
          y2={scale.bounds.top + scale.innerHeight * fraction}
          stroke="currentColor"
          strokeOpacity="0.1"
          strokeWidth="1"
        />
      ))}
      <path
        d={linePath(data, scale)}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {showPoints &&
        data.map((point, index) => (
          <circle
            key={point.label}
            cx={scale.x(index)}
            cy={scale.y(point.value)}
            r="3"
            fill="currentColor"
          />
        ))}
    </svg>
  );
}
