import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";
type ButtonSize = "default" | "sm" | "lg" | "icon";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-white hover:bg-accent-hover active:brightness-95",
  secondary:
    "border border-border text-text-primary hover:bg-bg-subtle active:bg-border-subtle",
  ghost:
    "text-text-primary hover:bg-bg-subtle active:bg-border-subtle",
  destructive:
    "text-destructive hover:bg-destructive/5 active:bg-destructive/10",
};

const sizeStyles: Record<ButtonSize, string> = {
  default: "h-11 px-6 text-[15px]",
  sm: "h-9 px-4 text-[14px]",
  lg: "h-12 px-8 text-[16px]",
  icon: "h-10 w-10 p-0",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = "primary", size = "default", isLoading, disabled, children, ...props },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-[10px] font-medium transition-all duration-150 cursor-pointer select-none",
          "disabled:opacity-40 disabled:pointer-events-none",
          variantStyles[variant],
          sizeStyles[size],
          isLoading && "opacity-70 pointer-events-none",
          className,
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : null}
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
