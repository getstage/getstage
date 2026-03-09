import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

type ConfirmPopoverProps = {
  open: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  className?: string;
  confirmLabel?: string;
  cancelLabel?: string;
};

export function ConfirmPopover({
  open,
  message,
  onConfirm,
  onCancel,
  className,
  confirmLabel = "Yes",
  cancelLabel = "No",
}: ConfirmPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!popoverRef.current?.contains(event.target as Node)) {
        onCancel();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onCancel();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onCancel, open]);

  if (!open) {
    return null;
  }

  return (
    <div
      ref={popoverRef}
      role="dialog"
      aria-modal="false"
      className={cn(
        "absolute z-30 min-w-[220px] rounded-[14px] border border-border bg-white p-3 shadow-[0_14px_30px_rgba(26,26,46,0.12)]",
        className,
      )}
    >
      <p className="text-[13px] leading-[1.45] text-text-primary">{message}</p>
      <div className="mt-3 flex justify-end gap-2">
        <Button size="sm" variant="secondary" onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button size="sm" onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </div>
  );
}
