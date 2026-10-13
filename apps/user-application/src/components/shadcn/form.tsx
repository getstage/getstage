import { CaretDown } from "@phosphor-icons/react";
import { RadioGroup as RadioGroupPrimitive, Slider as SliderPrimitive, ToggleGroup as ToggleGroupPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

// shadcn/ui Textarea, Select trigger, RadioGroup, Slider and ToggleGroup (new-york).
export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-16 w-full rounded-sg border-[length:var(--sg-border-width)] border-sg-input bg-transparent px-3 py-2 text-sm text-sg-foreground shadow-xs outline-none placeholder:text-sg-muted-foreground focus-visible:border-sg-ring focus-visible:ring-[3px] focus-visible:ring-sg-ring/50",
        className,
      )}
      {...props}
    />
  );
}

// Visual Select trigger; the preview never opens a listbox.
export function SelectTrigger({ className, children, ...props }: ComponentProps<"button">) {
  return (
    <button
      type="button"
      data-slot="select-trigger"
      className={cn(
        "flex h-9 w-full items-center justify-between gap-2 rounded-sg border-[length:var(--sg-border-width)] border-sg-input bg-transparent px-3 py-2 text-sm text-sg-foreground shadow-xs",
        className,
      )}
      {...props}
    >
      {children}
      <CaretDown size={14} className="opacity-50" />
    </button>
  );
}

export function RadioGroup({ className, ...props }: ComponentProps<typeof RadioGroupPrimitive.Root>) {
  return <RadioGroupPrimitive.Root data-slot="radio-group" className={cn("grid gap-3", className)} {...props} />;
}

export function RadioGroupItem({ className, ...props }: ComponentProps<typeof RadioGroupPrimitive.Item>) {
  return (
    <RadioGroupPrimitive.Item
      data-slot="radio-group-item"
      className={cn("aspect-square size-4 shrink-0 rounded-full border border-sg-input text-sg-primary shadow-xs outline-none data-[state=checked]:border-sg-primary", className)}
      {...props}
    >
      <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
        <span className="size-2 rounded-full bg-sg-primary" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  );
}

export function Slider({ className, ...props }: ComponentProps<typeof SliderPrimitive.Root>) {
  return (
    <SliderPrimitive.Root data-slot="slider" className={cn("relative flex w-full touch-none items-center select-none", className)} {...props}>
      <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-sg-muted">
        <SliderPrimitive.Range className="absolute h-full bg-sg-primary" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb aria-label="Value" className="block size-4 shrink-0 rounded-full border border-sg-primary bg-sg-background shadow-sm" />
    </SliderPrimitive.Root>
  );
}

export function ToggleGroup({ className, ...props }: ComponentProps<typeof ToggleGroupPrimitive.Root>) {
  return (
    <ToggleGroupPrimitive.Root
      data-slot="toggle-group"
      className={cn("flex w-fit items-center overflow-hidden rounded-sg border-[length:var(--sg-border-width)] border-sg-input shadow-xs", className)}
      {...props}
    />
  );
}

export function ToggleGroupItem({ className, ...props }: ComponentProps<typeof ToggleGroupPrimitive.Item>) {
  return (
    <ToggleGroupPrimitive.Item
      data-slot="toggle-group-item"
      className={cn("h-9 px-3 text-sm font-medium text-sg-muted-foreground data-[state=on]:bg-sg-accent data-[state=on]:text-sg-accent-foreground", className)}
      {...props}
    />
  );
}
