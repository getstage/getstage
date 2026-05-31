import { cn } from "@/lib/utils";

export function TaskSkeleton({ height }: { height?: number }) {
  return (
    <div
      style={{ height }}
      className={cn(
        "rounded-[8px] border border-dashed border-[#AFA9FF] bg-gradient-to-b from-white to-[#FAFAFA] opacity-60 shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]",
        !height && "h-[88px]",
      )}
    />
  );
}
