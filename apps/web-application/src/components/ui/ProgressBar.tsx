import { cn } from "@/lib/utils";
import { motion } from "motion/react";

interface ProgressBarProps {
  value: number;
  className?: string;
  showLabel?: boolean;
}

export function ProgressBar({ value, className, showLabel }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="relative h-[5px] flex-1 overflow-hidden rounded-full bg-border-subtle">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full bg-accent"
          initial={{ width: 0 }}
          animate={{ width: `${clamped}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
      {showLabel && (
        <span className="shrink-0 text-[13px] text-text-secondary tabular-nums">
          {clamped}%
        </span>
      )}
    </div>
  );
}
