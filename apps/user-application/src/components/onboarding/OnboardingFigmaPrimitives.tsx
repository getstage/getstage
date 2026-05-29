import type { ReactNode } from "react";
import { StageDatePicker } from "@/components/ui/StageDatePicker";
import stageLogo from "@/assets/logos/stage-logo-light.png";
import { cn } from "@/lib/utils";
import type { OnboardingStepId } from "@/features/onboarding/model";

const SETUP_PROGRESS_STEPS = ["details", "project-type", "method", "timeline"] as const;

function getProgressIndex(step: OnboardingStepId) {
  if (step === "phase-select") {
    return 2;
  }
  if (step === "preview" || step === "creating") {
    return 3;
  }
  return SETUP_PROGRESS_STEPS.indexOf(step as (typeof SETUP_PROGRESS_STEPS)[number]);
}

export const figmaFieldClass =
  "h-10 w-full rounded-[6px] border border-transparent bg-[#F5F5F5] px-3 text-[12px] font-medium text-[#525252] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] outline-none transition-colors placeholder:text-[#737373] focus:border-[#E5E5E5] focus:bg-white";

export function FigmaOnboardingFrame({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("w-[min(516px,calc(100vw-40px))]", className)}>
      {children}
    </div>
  );
}

export function FigmaOnboardingLogo({ centered = false }: { centered?: boolean }) {
  return (
    <img
      src={stageLogo}
      alt="Stage"
      className={cn("h-[23px] w-auto", centered && "mx-auto")}
    />
  );
}

export function FigmaStepHeader({
  step,
  title = "Create a new project",
  subtitle = "Set up the basics to get started",
  showProgress = true,
}: {
  step: OnboardingStepId;
  title?: string;
  subtitle?: string;
  showProgress?: boolean;
}) {
  const progressIndex = getProgressIndex(step);

  return (
    <>
      <FigmaOnboardingLogo />
      <div className="mt-8 flex w-full items-end justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="text-[21px] leading-[1.2] font-semibold text-[#0A0A0A]">
            {title}
          </h3>
          <p className="mt-2.5 text-[13px] leading-[1.5] font-medium text-[#525252]">
            {subtitle}
          </p>
        </div>
        {showProgress && progressIndex >= 0 ? (
          <div className="mb-1 flex shrink-0 items-center gap-1">
            {SETUP_PROGRESS_STEPS.map((item, index) => (
              <span
                key={item}
                className={cn(
                  "h-[6px] w-8 rounded-[2px]",
                  index <= progressIndex
                    ? "bg-gradient-to-r from-[#8D87FF] via-[rgba(141,135,255,0.75)] to-[#8D87FF]"
                    : "bg-[#E7E6FD]",
                )}
              />
            ))}
          </div>
        ) : null}
      </div>
    </>
  );
}

export function FigmaSection({
  label,
  children,
  className,
  innerClassName,
}: {
  label?: string;
  children: ReactNode;
  className?: string;
  innerClassName?: string;
}) {
  return (
    <div className={cn("rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]", className)}>
      {label ? (
        <div className="px-3 pb-2.5 pt-2.5 text-[13px] font-bold text-[#0A0A0A]">
          {label}
        </div>
      ) : null}
      <div className={cn("rounded-[8px] bg-white p-4 shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]", innerClassName)}>
        {children}
      </div>
    </div>
  );
}

export function FigmaLabel({ children }: { children: ReactNode }) {
  return <label className="mb-2 block text-[13px] font-medium text-[#171717]">{children}</label>;
}

export function TimelineDateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative flex-1">
      <label className="mb-2 block text-[13px] font-semibold text-text-primary">{label}</label>
      <StageDatePicker
        value={value}
        onChange={onChange}
        ariaLabel={`Project ${label.toLowerCase()} date`}
      />
    </div>
  );
}
