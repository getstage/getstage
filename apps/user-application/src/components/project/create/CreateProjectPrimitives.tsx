import type { ReactNode } from "react";
import { StageDatePicker } from "@/components/ui/StageDatePicker";
import { cn } from "@/lib/utils";
import { CREATE_PROJECT_PROGRESS_STEPS } from "@/models/project/createProject";

export const inputSurfaceClassName =
  "h-[34px] w-full rounded-[6px] bg-[#f5f5f5] px-[12px] py-[10px] text-[12px] font-medium leading-[1.25] text-[#171717] shadow-[0px_0.45px_1px_0px_rgba(10,10,10,0.25)] outline-none transition-colors placeholder:text-[#525252] hover:bg-[#eeeeee] focus:bg-white focus:ring-1 focus:ring-[#8d87ff]";

export const uploadButtonClassName =
  "flex h-[34px] w-full cursor-pointer items-center gap-[12px] overflow-hidden rounded-[6px] bg-[#f5f5f5] px-[12px] py-[10px] text-left text-[12px] font-medium leading-[1.25] text-[#525252] shadow-[0px_0.45px_1px_0px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#eeeeee] hover:text-[#171717]";

export function CreateProjectStepShell({
  title,
  description,
  activeStepIndex,
  headerGapClassName = "gap-[10px]",
  titleClassName = "w-full",
  descriptionClassName = "w-[261px]",
  onStepSelect,
  children,
}: {
  title: string;
  description: string;
  activeStepIndex: number;
  headerGapClassName?: string;
  titleClassName?: string;
  descriptionClassName?: string;
  onStepSelect?: (stepIndex: number) => void;
  children: ReactNode;
}) {
  return (
    <div className="flex w-full flex-col items-start gap-[24px]">
      <div className={cn("flex w-full items-end justify-between", headerGapClassName)}>
        <div className="flex min-w-0 flex-1 flex-col items-start gap-[10px]">
          <div className="flex w-full flex-col items-start">
            <h1 className={cn("text-[21px] font-semibold leading-[1.2] text-[#0a0a0a]", titleClassName)}>
              {title}
            </h1>
          </div>
          <p className={cn("text-[13px] font-medium leading-[1.5] text-[#525252]", descriptionClassName)}>
            {description}
          </p>
        </div>

        <div
          className="flex shrink-0 items-center gap-[4px]"
          aria-label={`Step ${activeStepIndex + 1} of ${CREATE_PROJECT_PROGRESS_STEPS.length}`}
        >
          {CREATE_PROJECT_PROGRESS_STEPS.map((step) => {
            const canGoBack = step < activeStepIndex && Boolean(onStepSelect);

            return (
              <button
                key={step}
                type="button"
                disabled={!canGoBack}
                onClick={() => onStepSelect?.(step)}
                aria-label={canGoBack ? `Go back to step ${step + 1}` : `Step ${step + 1}`}
                className={cn(
                  "h-[6px] w-[32px] rounded-[2px] transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8d87ff] focus-visible:ring-offset-2",
                  step <= activeStepIndex
                    ? "bg-gradient-to-r from-[#8d87ff] via-[rgba(141,135,255,0.75)] to-[#8d87ff]"
                    : "bg-[#e7e6fd]",
                  canGoBack ? "cursor-pointer hover:opacity-70" : "cursor-default",
                )}
              />
            );
          })}
        </div>
      </div>

      {children}
    </div>
  );
}

export function FormCard({
  title,
  titleWeight = "medium",
  bodyPaddingClassName = "p-[12px]",
  children,
}: {
  title?: string;
  titleWeight?: "medium" | "semibold";
  bodyPaddingClassName?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex w-full flex-col items-start rounded-[12px] bg-[#f5f5f5] p-[4px] shadow-[0px_0.45px_0.5px_0px_rgba(10,10,10,0.25)]">
      {title ? (
        <div className="flex items-center justify-center px-[12px] pb-[12px] pt-[8px]">
          <p
            className={cn(
              "whitespace-nowrap text-[13px] leading-[1.5] text-[#0a0a0a]",
              titleWeight === "semibold" ? "font-semibold" : "font-medium",
            )}
          >
            {title}
          </p>
        </div>
      ) : null}

      <div className={cn("flex w-full flex-col items-start gap-[16px] rounded-[8px] bg-white shadow-[0px_0.45px_0.5px_0px_rgba(10,10,10,0.25)]", bodyPaddingClassName)}>
        {children}
      </div>
    </div>
  );
}

export function Field({
  label,
  secondaryLabel,
  children,
}: {
  label: string;
  secondaryLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex w-full flex-col items-start gap-[8px]">
      <span className="flex items-start gap-[6px] whitespace-nowrap text-[13px] font-medium leading-[1.25]">
        <span className="text-[#171717]">{label}</span>
        {secondaryLabel ? <span className="text-[#737373]">{secondaryLabel}</span> : null}
      </span>
      {children}
    </div>
  );
}

export function FormError({ children }: { children: ReactNode }) {
  return (
    <p className="text-[12px] font-medium leading-[1.5] text-[#b91c1c]">
      {children}
    </p>
  );
}

export function ContinueButton({ disabled = false }: { disabled?: boolean }) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className={cn(
        "flex w-full items-center justify-center gap-[8px] rounded-[6px] border border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7b76df] to-[#463fba] py-[10px] pl-[10px] pr-[12px] text-[13px] font-medium leading-[1.25] text-[#fafafa] shadow-[0px_0.45px_0.5px_0px_rgba(10,10,10,0.25)] transition-opacity",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:opacity-95",
      )}
    >
      <span className="[text-shadow:0px_0.5px_1.5px_rgba(0,0,0,0.15)]">
        Continue
      </span>
      <ArrowRightIcon />
    </button>
  );
}

export function CreateProjectButton({
  isCreating,
  disabled,
}: {
  isCreating: boolean;
  disabled: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="flex w-full cursor-pointer items-center justify-center gap-[8px] rounded-[6px] border border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7b76df] to-[#463fba] py-[10px] pl-[10px] pr-[12px] text-[13px] font-medium leading-[1.25] text-[#fafafa] shadow-[0px_0.45px_0.5px_0px_rgba(10,10,10,0.25)] transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span className="[text-shadow:0px_0.5px_1.5px_rgba(0,0,0,0.15)]">
        {isCreating ? "Creating..." : "Create Project"}
      </span>
      <ArrowRightIcon />
    </button>
  );
}

export function DateInput({
  value,
  onChange,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
}) {
  return (
    <StageDatePicker
      value={value}
      onChange={onChange}
      ariaLabel={ariaLabel}
    />
  );
}

export function RadioOption({
  selected,
  label,
  onSelect,
}: {
  selected: boolean;
  label: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex cursor-pointer items-center gap-[8px] text-[13px] font-medium leading-[1.25] text-[#171717]"
      aria-pressed={selected}
    >
      <span
        className={cn(
          "flex h-[14px] w-[14px] shrink-0 items-center justify-center rounded-full",
          selected ? "bg-[#0a0a0a] p-[4px]" : "bg-[#e5e5e5]",
        )}
      >
        {selected ? <span className="h-[6px] w-[6px] rounded-full bg-[#fafafa]" /> : null}
      </span>
      <span>{label}</span>
    </button>
  );
}

export function ToggleSwitch({
  checked,
  onToggle,
}: {
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "flex h-[18px] w-[30px] shrink-0 cursor-pointer items-center overflow-hidden rounded-full p-[2px] transition-colors",
        checked ? "justify-end bg-[#dbd9fc]" : "justify-start bg-[#e5e5e5]",
      )}
      aria-pressed={checked}
    >
      <span className="h-full aspect-square rounded-full bg-[#404040]" />
    </button>
  );
}

export function ArrowLeftIcon() {
  return <img src="/logos/back.svg" alt="" aria-hidden="true" className="h-[16px] w-[16px] shrink-0" />;
}

export function ArrowRightIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className="h-[16px] w-[16px] shrink-0"
    >
      <path
        d="M6 4 10 8l-4 4M3 8h6.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function UploadIcon() {
  return (
    <span
      aria-hidden="true"
      className="h-[16px] w-[16px] shrink-0 bg-current"
      style={{
        WebkitMask:
          'url("/logos/dashboard/upload.svg") center / contain no-repeat',
        mask: 'url("/logos/dashboard/upload.svg") center / contain no-repeat',
      }}
    />
  );
}

export function DragHandleIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className="h-[16px] w-[16px] shrink-0 text-[#404040]"
    >
      <path
        d="M6 4.5h.01M10 4.5h.01M6 8h.01M10 8h.01M6 11.5h.01M10 11.5h.01"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function PlusIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className="h-[16px] w-[16px] shrink-0"
    >
      <path
        d="M8 3.75v8.5M3.75 8h8.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ChevronDownIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className="pointer-events-none absolute right-[12px] top-1/2 h-[16px] w-[16px] -translate-y-1/2 text-[#171717]"
    >
      <path
        d="m4.5 6.5 3.5 3 3.5-3"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
