import { cn } from "@/lib/utils";
import { seriesOpacity } from "./chart-geometry";

export type ChartLegendItem = string | { label: string; color?: string };

export function ChartLegend({
  items,
  className,
}: {
  items: ChartLegendItem[];
  className?: string;
}) {
  return (
    <ul className={cn("flex flex-wrap items-center gap-4", className)}>
      {items.map((item, index) => {
        const label = typeof item === "string" ? item : item.label;
        const color = typeof item === "string" ? undefined : item.color;
        return (
          <li key={`${label}-${index}`} className="flex items-center gap-2 text-xs text-muted-foreground">
            <span
              className="size-2.5 rounded-full bg-current"
              style={color ? { backgroundColor: color } : { opacity: seriesOpacity(index, items.length) }}
            />
            {label}
          </li>
        );
      })}
    </ul>
  );
}
