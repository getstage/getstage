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
        "w-full rounded-[10px] bg-accent px-4 py-[13px] text-[15px] font-medium text-white transition-colors",
        disabled ? "cursor-default opacity-40" : "cursor-pointer hover:bg-accent-hover",
      )}
    >
      {label}
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
    <div className="mt-6 flex justify-center gap-1.5">
      {steps.map((step, index) => (
        <div
          key={`${step}-${index}`}
          className={cn(
            "h-1.5 rounded-[3px] transition-all duration-200",
            index === currentIndex
              ? "w-8 bg-accent"
              : index < currentIndex
                ? "w-2 bg-accent"
                : "w-2 bg-[#D9D9D9]",
          )}
        />
      ))}
    </div>
  );
}
