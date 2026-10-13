import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

// shadcn/ui Breadcrumb, Pagination, a static DropdownMenu, Skeleton, Separator and Kbd (new-york).
export function Breadcrumb({ items }: { items: string[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-sg-muted-foreground">
        {items.map((item, index) => (
          <li key={item} className="flex items-center gap-1.5">
            {index > 0 ? <CaretRight size={12} /> : null}
            <span className={index === items.length - 1 ? "font-normal text-sg-foreground" : undefined}>{item}</span>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function Pagination({ pages, current }: { pages: number; current: number }) {
  return (
    <nav aria-label="Pagination" className="flex items-center gap-1">
      <Button variant="ghost" size="sm"><CaretLeft size={14} /> Previous</Button>
      {Array.from({ length: pages }, (_, index) => (
        <Button key={index} variant={index + 1 === current ? "outline" : "ghost"} size="icon" className="size-8">{index + 1}</Button>
      ))}
      <Button variant="ghost" size="sm">Next <CaretRight size={14} /></Button>
    </nav>
  );
}

// The open state of a DropdownMenu, drawn statically so the preview can show it.
export function MenuPanel({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("min-w-48 rounded-sg border border-sg-border bg-sg-background p-1 text-sg-foreground shadow-md", className)}>
      <div className="px-2 py-1.5 text-sm font-medium">{label}</div>
      <Separator className="-mx-1 my-1" />
      {children}
    </div>
  );
}

export function MenuItem({ children, shortcut, destructive = false }: { children: ReactNode; shortcut?: string; destructive?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-sg-accent", destructive && "text-sg-destructive")}>
      {children}
      {shortcut ? <span className="ml-auto text-xs tracking-widest text-sg-muted-foreground">{shortcut}</span> : null}
    </div>
  );
}

export function Separator({ className, ...props }: ComponentProps<"div">) {
  return <div role="separator" data-slot="separator" className={cn("h-px w-full shrink-0 bg-sg-border", className)} {...props} />;
}

export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="skeleton" className={cn("animate-pulse rounded-sg bg-sg-muted", className)} {...props} />;
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded-sm border border-sg-border bg-sg-muted px-1 font-[family-name:var(--sg-font-mono)] text-xs text-sg-muted-foreground">{children}</kbd>;
}
