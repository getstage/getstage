import { cn } from "@/lib/utils";

interface TogglePillProps {
  label: string;
  selected: boolean;
  onSelect: () => void;
  className?: string;
}

export function TogglePill({ label, selected, onSelect, className }: TogglePillProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "rounded-full px-4 py-2 text-[14px] font-medium transition-all duration-150 cursor-pointer select-none",
        selected
          ? "bg-accent text-white"
          : "bg-border-subtle text-text-primary hover:bg-border",
        className,
      )}
    >
      {label}
    </button>
  );
}
