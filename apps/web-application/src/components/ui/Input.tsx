import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-[13px] font-medium text-text-secondary"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "h-11 w-full rounded-lg border bg-white px-3.5 text-[15px] text-text-primary placeholder:text-text-tertiary",
            "transition-colors duration-200",
            "focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20",
            error
              ? "border-destructive focus:border-destructive focus:ring-destructive/20"
              : "border-border",
            className,
          )}
          {...props}
        />
        {error && (
          <p className="text-[13px] text-destructive">{error}</p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";
