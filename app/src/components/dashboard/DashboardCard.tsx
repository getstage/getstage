import type { ReactNode } from "react";

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
      className={`rounded-[8px] bg-input-bg p-4 shadow-[0px_0.45px_1px_0px_rgba(10,10,10,0.25)] ${fullWidth ? "col-span-full" : ""} ${className ?? ""}`}
    >
      <div className="mb-6 flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-[14px] font-medium leading-[1.2] text-text-primary">
            {title}
          </h2>
          {subtitle && (
            <p className="text-[12px] font-medium leading-[1.5] text-text-secondary">
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
      className="rounded-[6px] bg-bg-subtle px-3 py-1.5 text-[13px] font-medium text-text-secondary shadow-[0px_0.45px_1px_0px_rgba(10,10,10,0.25)] transition-all duration-150 hover:text-text-primary"
    >
      {label}
    </button>
  );
}
