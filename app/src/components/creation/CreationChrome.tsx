import { ArrowLeft } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import type { WorkflowStep } from "@/hooks/useProjectCreation";

const transition = { duration: 0.2, ease: "easeInOut" } as const;

export function StepCard({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={transition}
    >
      {children}
    </motion.div>
  );
}

type PrimaryButtonProps = {
  label: string;
  disabled?: boolean;
  onClick: () => void;
};

export function PrimaryButton({ label, disabled, onClick }: PrimaryButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full rounded-[6px] border border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7B76DF] to-[#463FBA] px-4 py-[10px] text-[13px] font-medium text-white shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] transition-opacity",
        disabled ? "cursor-default opacity-40" : "cursor-pointer hover:opacity-95",
      )}
    >
      {label} <span className="ml-2">→</span>
    </button>
  );
}

export function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-4 inline-flex cursor-pointer items-center gap-1 text-[13px] text-text-secondary transition-colors hover:text-text-primary"
    >
      <ArrowLeft size={12} weight="bold" />
      Back
    </button>
  );
}

type StepDotsProps = {
  steps: WorkflowStep[];
  currentIndex: number;
};

export function StepDots({ steps, currentIndex }: StepDotsProps) {
  if (currentIndex < 0) {
    return null;
  }

  return (
    <div className="flex items-center justify-center gap-2">
      {steps.map((step, index) => (
        <div
          key={`${step}-${index}`}
          className={cn(
            "h-[6px] rounded-full transition-all duration-200",
            index === currentIndex
              ? "w-[32px] bg-gradient-to-r from-[#8D87FF] to-[#716BE6]"
              : "w-[6px] bg-[#D9D9D9]",
          )}
        />
      ))}
    </div>
  );
}
