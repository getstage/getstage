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
      className={`rounded-[8px] bg-[#f5f5f5] p-[16px] shadow-[0px_0.45px_1px_0px_rgba(10,10,10,0.25)] ${fullWidth ? "col-span-full" : ""} ${className ?? ""}`}
    >
      <div className="mb-[24px] flex items-center justify-between">
        <div>
          <p className="text-[14px] font-medium leading-[1.2] text-[#0a0a0a]">
            {title}
          </p>
          {subtitle && (
            <p className="mt-0.5 text-[12px] font-medium leading-[1.5] text-[#737373]">
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
      className="rounded-[6px] bg-[#fafafa] py-[6px] pl-[10px] pr-[12px] text-[13px] font-medium text-[#737373] shadow-[0px_0.45px_1px_0px_rgba(10,10,10,0.25)] transition-all duration-150 hover:text-[#0a0a0a]"
    >
      {label}
    </button>
  );
}
