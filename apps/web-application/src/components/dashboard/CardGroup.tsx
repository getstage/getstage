import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type CardGroupProps = {
  children: ReactNode;
  className?: string;
};

export function CardGroup({ children, className }: CardGroupProps) {
  return (
    <div className={cn("overflow-clip rounded-[10px] bg-[#f5f5f5] p-[2px]", className)}>
      {children}
    </div>
  );
}
