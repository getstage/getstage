import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SettingsCard({
  title,
  children,
  className,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-[8px] bg-[#F5F5F5] p-[8px] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]", className)}>
      {title ? (
        <h2 className="px-[12px] py-[8px] font-heading text-[13px] font-semibold text-[#0A0A0A]">
          {title}
        </h2>
      ) : null}
      {children}
    </section>
  );
}

export function SettingsRow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-[6px] bg-white p-[16px] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]", className)}>
      {children}
    </div>
  );
}

export function SaveButton({ children = "Save" }: { children?: ReactNode }) {
  return (
    <button
      type="button"
      className="inline-flex h-[34px] min-w-[64px] items-center justify-center rounded-[6px] bg-white px-[14px] text-[13px] font-medium text-[#0A0A0A] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#FAFAFA]"
    >
      {children}
    </button>
  );
}

export function MockToggle({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        "flex h-[20px] w-[36px] items-center rounded-full p-[2px] transition-colors",
        active ? "bg-[#8782F5]" : "bg-[#E5E5E5]",
      )}
    >
      <span
        className={cn(
          "h-[16px] w-[16px] rounded-full transition-transform",
          active ? "translate-x-[16px] bg-white" : "translate-x-0 bg-[#737373]",
        )}
      />
    </span>
  );
}
