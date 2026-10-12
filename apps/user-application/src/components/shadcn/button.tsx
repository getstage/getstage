import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

// shadcn/ui Button (new-york). Tokens use the sg- prefix; see globals.css.
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-sg-button text-sm font-medium [text-transform:var(--sg-button-case)] outline-none transition-all [transition-duration:var(--sg-duration)] [transition-timing-function:var(--sg-easing)] focus-visible:ring-[3px] focus-visible:ring-sg-ring/50 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-sg-primary text-sg-primary-foreground shadow-xs hover:bg-sg-primary/90",
        destructive: "bg-sg-destructive text-white shadow-xs hover:bg-sg-destructive/90",
        outline: "border border-sg-border bg-sg-background shadow-xs hover:bg-sg-accent hover:text-sg-accent-foreground",
        secondary: "bg-sg-secondary text-sg-secondary-foreground shadow-xs hover:bg-sg-secondary/80",
        ghost: "hover:bg-sg-accent hover:text-sg-accent-foreground",
        link: "text-sg-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 gap-1.5 px-3",
        lg: "h-10 px-6",
        icon: "size-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "button";
  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}
