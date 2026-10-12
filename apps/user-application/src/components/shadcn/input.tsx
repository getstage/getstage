import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

// shadcn/ui Input + Label (new-york).
export function Input({ className, type, ...props }: ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-9 w-full min-w-0 rounded-sg border-[length:var(--sg-border-width)] border-sg-input bg-transparent px-3 py-1 text-base text-sg-foreground shadow-xs outline-none placeholder:text-sg-muted-foreground focus-visible:border-sg-ring focus-visible:ring-[3px] focus-visible:ring-sg-ring/50 md:text-sm",
        className,
      )}
      {...props}
    />
  );
}

export function Label({ className, ...props }: ComponentProps<"label">) {
  return <label data-slot="label" className={cn("flex items-center gap-2 text-sm font-medium leading-none select-none", className)} {...props} />;
}
