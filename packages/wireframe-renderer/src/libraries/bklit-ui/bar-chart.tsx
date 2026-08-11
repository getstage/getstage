import { cn } from "@/lib/utils";
import { CHART_HEIGHT, CHART_WIDTH, chartScale } from "./chart-geometry";
import type { ChartPoint } from "./chart-geometry";

export function BarChart({
  data,
  label,
  showLabels = true,
  className,
}: {
  data: ChartPoint[];
  label: string;
  showLabels?: boolean;
  className?: string;
}) {
  const scale = chartScale(data);
  const barWidth = scale.bandWidth * 0.62;

  return (
    <svg
      viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
      className={cn("h-full w-full", className)}
      role="img"
      aria-label={label}
    >
      {data.map((point, index) => {
        const top = scale.y(point.value);
        const x = scale.bounds.left + scale.bandWidth * index + (scale.bandWidth - barWidth) / 2;
        return (
          <g key={point.label}>
            <rect
              x={x}
              y={top}
              width={barWidth}
              height={Math.max(scale.baseline - top, 1)}
              rx="3"
              fill="currentColor"
            />
            {showLabels && (
              <text
                x={x + barWidth / 2}
                y={CHART_HEIGHT - 6}
                textAnchor="middle"
                fill="currentColor"
                fillOpacity="0.55"
                fontSize="9"
              >
                {point.label}
              </text>
            )}
          </g>
        );
      })}
      <line
        x1={scale.bounds.left}
        y1={scale.baseline}
        x2={CHART_WIDTH - scale.bounds.right}
        y2={scale.baseline}
        stroke="currentColor"
        strokeOpacity="0.18"
        strokeWidth="1"
      />
    </svg>
  );
}
