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
      className={`flex flex-col items-start gap-[clamp(18px,3vw,24px)] rounded-[8px] bg-gradient-to-b from-white to-[#fafafa] p-[16px] shadow-[0px_0.45px_0.5px_0px_rgba(10,10,10,0.25)] ${fullWidth ? "col-span-full" : ""} ${className ?? ""}`}
    >
      <div className="flex w-full flex-wrap items-center justify-between gap-[12px]">
        <div className="flex min-w-0 flex-col gap-[4px]">
          <p className="text-[14px] font-medium leading-[1.2] text-[#0a0a0a]">
            {title}
          </p>
          {subtitle && (
            <p className="text-[12px] font-medium leading-[1.5] text-[#737373]">
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
      className="shrink-0 rounded-[6px] bg-[#fafafa] py-[6px] pl-[10px] pr-[12px] text-[13px] font-medium leading-none text-[#737373] shadow-[0px_0.45px_0.5px_0px_rgba(10,10,10,0.25)] transition-all duration-150 hover:text-[#0a0a0a]"
    >
      {label}
    </button>
  );
}
