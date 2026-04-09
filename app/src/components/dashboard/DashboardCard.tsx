import type { ReactNode } from "react";

type DashboardCardProps = {
  title: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
  fullWidth?: boolean;
};

export function DashboardCard({
  title,
  children,
  className,
  action,
  fullWidth,
}: DashboardCardProps) {
  return (
    <div
      className={`rounded-[14px] border border-border bg-white p-6 ${fullWidth ? "col-span-full" : ""} ${className ?? ""}`}
    >
      <div className="mb-5 flex items-center justify-between">
        <h2 className="font-heading text-[15px] font-semibold text-text-primary">
          {title}
        </h2>
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
      className="rounded-[6px] border border-border bg-transparent px-3 py-1 font-body text-[12px] font-medium text-text-secondary transition-all duration-150 hover:border-text-secondary hover:text-text-primary"
    >
      {label}
    </button>
  );
}
