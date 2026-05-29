import type { ReactNode } from "react";

export function CanvasShell({
  centered,
  children,
}: {
  centered?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="min-h-[690px] rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
      <div
        className={`flex min-h-[682px] rounded-[8px] bg-white p-11 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] ${
          centered ? "items-center justify-center" : ""
        }`}
      >
        {children}
      </div>
    </div>
  );
}
