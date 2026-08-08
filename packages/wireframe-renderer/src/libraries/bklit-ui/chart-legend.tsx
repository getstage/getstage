import { cn } from "@/lib/utils";
import { seriesOpacity } from "./chart-geometry";

export function ChartLegend({
  items,
  className,
}: {
  items: string[];
  className?: string;
}) {
  return (
    <ul className={cn("flex flex-wrap items-center gap-4 text-primary", className)}>
      {items.map((item, index) => (
        <li key={item} className="flex items-center gap-2 text-xs text-muted-foreground">
          <span
            className="size-2.5 rounded-full bg-current text-primary"
            style={{ opacity: seriesOpacity(index, items.length) }}
          />
          {item}
        </li>
      ))}
    </ul>
  );
}
