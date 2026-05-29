import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { surfaceStyles, textStyles } from "@/styles/recipes";

type DashboardCardProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
  fullWidth?: boolean;
};

export function DashboardCard({
  title,
  subtitle,
  children,
  className,
  action,
  fullWidth,
}: DashboardCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-start gap-[clamp(18px,3vw,24px)] p-4",
        surfaceStyles.elevatedCard,
        fullWidth && "col-span-full",
        className,
      )}
    >
      <div className="flex w-full flex-wrap items-center justify-between gap-[12px]">
        <div className="flex min-w-0 flex-col gap-[4px]">
          <p className="text-[14px] font-medium leading-[1.2] text-ink">
            {title}
          </p>
          {subtitle && (
            <p className={textStyles.caption}>
              {subtitle}
            </p>
          )}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

type CardTabProps = {
  label: string;
  onClick?: () => void;
};

export function CardTab({ label, onClick }: CardTabProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 rounded-control bg-surface-muted py-[6px] pl-[10px] pr-3 text-[13px] font-medium leading-none text-ink-subtle shadow-stage-hairline transition-all duration-150 hover:text-ink"
    >
      {label}
    </button>
  );
}
