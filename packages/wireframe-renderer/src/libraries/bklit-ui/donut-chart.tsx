import { cn } from "@/lib/utils";
import { arcPath, seriesOpacity } from "./chart-geometry";
import type { ChartPoint } from "./chart-geometry";

const DONUT_SIZE = 160;
const CENTER = DONUT_SIZE / 2;

export function DonutChart({
  data,
  label,
  centerLabel,
  className,
}: {
  data: ChartPoint[];
  label: string;
  centerLabel: string;
  className?: string;
}) {
  const total = data.reduce((sum, point) => sum + point.value, 0);
  let startTurn = 0;

  return (
    <svg
      viewBox={`0 0 ${DONUT_SIZE} ${DONUT_SIZE}`}
      className={cn("h-full w-full", className)}
      role="img"
      aria-label={label}
    >
      {data.map((point, index) => {
        const turn = total === 0 ? 0 : point.value / total;
        const path = arcPath(CENTER, CENTER, 70, 46, startTurn, startTurn + turn);
        startTurn += turn;
        return (
          <path
            key={point.label}
            d={path}
            fill="currentColor"
            fillOpacity={seriesOpacity(index, data.length)}
          />
        );
      })}
      <text
        x={CENTER}
        y={CENTER - 2}
        textAnchor="middle"
        fill="currentColor"
        fontSize="22"
        fontWeight="600"
      >
        {total}
      </text>
      <text
        x={CENTER}
        y={CENTER + 14}
        textAnchor="middle"
        fill="currentColor"
        fillOpacity="0.55"
        fontSize="9"
      >
        {centerLabel}
      </text>
    </svg>
  );
}
