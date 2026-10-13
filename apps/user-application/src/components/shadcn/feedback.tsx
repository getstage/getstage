import { Avatar as AvatarPrimitive, Progress as ProgressPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

// shadcn/ui Alert, Progress, Avatar and Table (new-york).
export function Alert({ className, destructive = false, ...props }: ComponentProps<"div"> & { destructive?: boolean }) {
  return (
    <div
      role="alert"
      data-slot="alert"
      className={cn(
        "relative grid w-full gap-0.5 rounded-sg border border-sg-border bg-sg-card px-4 py-3 text-sm text-sg-card-foreground",
        destructive && "border-sg-destructive/40 text-sg-destructive [&_[data-slot=alert-description]]:text-sg-destructive/80",
        className,
      )}
      {...props}
    />
  );
}

export function AlertTitle({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="alert-title" className={cn("font-medium tracking-tight", className)} {...props} />;
}

export function AlertDescription({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="alert-description" className={cn("text-sm text-sg-muted-foreground", className)} {...props} />;
}

export function Progress({ className, value, ...props }: ComponentProps<typeof ProgressPrimitive.Root>) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn("relative h-2 w-full overflow-hidden rounded-full bg-sg-primary/20", className)}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className="h-full w-full flex-1 bg-sg-primary transition-all"
        style={{ transform: `translateX(-${100 - (value ?? 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}

export function Avatar({ className, ...props }: ComponentProps<typeof AvatarPrimitive.Root>) {
  return <AvatarPrimitive.Root data-slot="avatar" className={cn("relative flex size-8 shrink-0 overflow-hidden rounded-full", className)} {...props} />;
}

export function AvatarFallback({ className, ...props }: ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn("flex size-full items-center justify-center rounded-full bg-sg-muted text-xs", className)}
      {...props}
    />
  );
}

export function Table({ className, ...props }: ComponentProps<"table">) {
  return <table data-slot="table" className={cn("w-full caption-bottom text-sm", className)} {...props} />;
}

export function TableRow({ className, ...props }: ComponentProps<"tr">) {
  return <tr data-slot="table-row" className={cn("border-b border-sg-border transition-colors hover:bg-sg-muted/50", className)} {...props} />;
}

export function TableHead({ className, ...props }: ComponentProps<"th">) {
  return <th data-slot="table-head" className={cn("h-10 px-2 text-left align-middle font-medium whitespace-nowrap text-sg-foreground", className)} {...props} />;
}

export function TableCell({ className, ...props }: ComponentProps<"td">) {
  return <td data-slot="table-cell" className={cn("p-2 align-middle whitespace-nowrap", className)} {...props} />;
}
