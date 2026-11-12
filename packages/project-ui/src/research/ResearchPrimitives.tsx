import type { ReactNode } from "react";

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="text-[15px] font-medium leading-[1.25] text-[#171717]">{children}</h2>;
}

export function Divider() {
  return <div className="h-px w-full bg-[#E5E5E5]" />;
}
