import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

// shadcn/ui Card (new-york). Shadow follows the guide's depth setting.
export function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        "flex flex-col gap-6 rounded-sg border-[length:var(--sg-border-width)] border-sg-border bg-sg-card py-6 text-sg-card-foreground [box-shadow:var(--sg-shadow)]",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="card-header" className={cn("grid auto-rows-min items-start gap-1.5 px-6", className)} {...props} />;
}

export function CardTitle({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("font-[family-name:var(--sg-font-heading)] font-semibold leading-none [text-transform:var(--sg-container-case)]", className)}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="card-description" className={cn("text-sm text-sg-muted-foreground", className)} {...props} />;
}

export function CardContent({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="card-content" className={cn("px-6", className)} {...props} />;
}

export function CardFooter({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="card-footer" className={cn("flex items-center gap-2 px-6", className)} {...props} />;
}
