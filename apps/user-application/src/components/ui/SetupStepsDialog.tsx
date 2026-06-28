import type { ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";

// Shared "here's how to set this up" modal: title + numbered steps + optional note and a
// primary action. Used for integration setup (Paper) and OS permission prompts (screen
// capture) so those flows share one look instead of each re-implementing a Radix dialog.
export function SetupStepsDialog({
  open,
  onOpenChange,
  icon,
  title,
  description,
  steps,
  note,
  primaryAction,
  closeLabel = "Got it",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  icon?: ReactNode;
  title: string;
  description: string;
  steps: string[];
  note?: string | null;
  primaryAction?: { label: string; onClick: () => void };
  closeLabel?: string;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[rgba(10,10,10,0.22)]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-32px)] max-w-[460px] -translate-x-1/2 -translate-y-1/2 rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25),0_18px_55px_rgba(10,10,10,0.22)] outline-none">
          <div className="p-3">
            <div className="flex items-start gap-3">
              {icon ? (
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-white text-[#171717] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
                  {icon}
                </span>
              ) : null}
              <div className="min-w-0">
                <Dialog.Title className="text-[15px] font-medium leading-[1.25] text-[#0A0A0A]">
                  {title}
                </Dialog.Title>
                <Dialog.Description className="mt-1 text-[13px] font-medium leading-[1.45] text-[#525252]">
                  {description}
                </Dialog.Description>
              </div>
            </div>
          </div>

          <div className="rounded-[8px] bg-white p-3 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
            <ol className="grid gap-3">
              {steps.map((step, index) => (
                <li key={step} className="grid grid-cols-[24px_minmax(0,1fr)] gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#F5F5F5] text-[12px] font-semibold leading-none text-[#171717]">
                    {index + 1}
                  </span>
                  <span className="pt-[3px] text-[13px] font-medium leading-[1.45] text-[#404040]">
                    {step}
                  </span>
                </li>
              ))}
            </ol>
            {note ? (
              <p className="mt-3 rounded-[6px] bg-[#FAFAFA] p-2 text-[12px] font-medium leading-[1.45] text-[#737373]">
                {note}
              </p>
            ) : null}
          </div>

          <div className="flex justify-end gap-2 p-3">
            {primaryAction ? (
              <button
                type="button"
                onClick={primaryAction.onClick}
                className="inline-flex h-[34px] items-center justify-center rounded-[6px] bg-[#171717] px-3 text-[13px] font-medium leading-none text-white shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#2A2A2A]"
              >
                {primaryAction.label}
              </button>
            ) : null}
            <Dialog.Close asChild>
              <button
                type="button"
                className="inline-flex h-[34px] items-center justify-center rounded-[6px] bg-white px-3 text-[13px] font-medium leading-none text-[#525252] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#FAFAFA]"
              >
                {closeLabel}
              </button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
