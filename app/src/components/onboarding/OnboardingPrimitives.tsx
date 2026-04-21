import type { ReactNode } from "react";
import { ArrowUpRight, Eye } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export function OptionCard({
  active,
  title,
  description,
  onClick,
}: {
  active: boolean;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "cursor-pointer rounded-xl border-[1.5px] bg-input-bg px-5 py-[18px] text-left transition-colors focus:outline-none",
        active ? "border-accent bg-[rgba(135,130,245,0.08)]" : "border-transparent hover:bg-[#EFEFEF]",
      )}
    >
      <div
        className={cn(
          "mb-1 text-[15px] font-medium",
          active ? "text-accent" : "text-text-primary",
        )}
      >
        {title}
      </div>
      <div className="text-[13px] leading-[1.4] text-text-secondary">{description}</div>
    </button>
  );
}

export function GuideLink({
  href,
  children,
  className,
  openInNewTab = false,
}: {
  href?: string | null;
  children: ReactNode;
  className?: string;
  openInNewTab?: boolean;
}) {
  if (!href) {
    return (
      <span className={cn("mt-4 inline-flex items-center gap-1.5 text-[15px] text-accent/60", className)}>
        <Eye size={16} />
        {children}
      </span>
    );
  }

  return (
    <a
      href={href}
      target={openInNewTab || href.startsWith("http") ? "_blank" : undefined}
      rel={openInNewTab || href.startsWith("http") ? "noreferrer noopener" : undefined}
      className={cn(
        "mt-4 inline-flex items-center gap-1 text-[15px] text-accent transition-colors hover:text-accent-hover",
        className,
      )}
    >
      {children}
      {openInNewTab ? <ArrowUpRight size={13} weight="bold" /> : <Eye size={16} />}
    </a>
  );
}

export function StepDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, index) => (
        <div
          key={index}
          className={cn(
            "h-1.5 w-8 rounded-[3px] transition-colors duration-200",
            index <= current
              ? "bg-gradient-to-r from-[#8D87FF] to-[#716BE6]"
              : "bg-[#E7E6FD]",
          )}
        />
      ))}
    </div>
  );
}

export function StepShell({
  label,
  children,
  className,
}: {
  label?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]", className)}>
      {label ? (
        <div className="px-4 pb-3 pt-3 text-[13px] font-semibold text-text-primary">{label}</div>
      ) : null}
      <div className="rounded-[8px] bg-white p-4 shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">{children}</div>
    </div>
  );
}

export function OnboardingStepMotion({
  motionKey,
  children,
  className,
}: {
  motionKey: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      key={motionKey}
      initial={{ opacity: 0, y: 14, scale: 0.995, filter: "blur(3px)" }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
      exit={{ opacity: 0, y: -12, scale: 0.996, filter: "blur(2px)" }}
      transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
