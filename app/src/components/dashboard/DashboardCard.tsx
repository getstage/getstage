import type { ReactNode } from "react";

type DashboardCardProps = {
  title: string;
  children: ReactNode;
  className?: string;
};

export function DashboardCard({ title, children, className }: DashboardCardProps) {
  return (
    <div
      className={`rounded-[12px] border border-border bg-white px-[22px] py-5 ${className ?? ""}`}
    >
      <h2 className="mb-3 font-heading text-[15px] font-medium text-text-primary">{title}</h2>
      {children}
    </div>
  );
}
