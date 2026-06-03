import * as Dialog from "@radix-ui/react-dialog";
import type { ValidatedStrategyGenerateInput } from "@/lib/project/strategyGenerateInput";
import type { StrategyGenerateFormValues } from "@/lib/project/strategyGenerateInput";
import { StrategyGenerateStep } from "./tabs/strategy/StrategyGenerateStep";

type StrategyRegenerateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValues?: StrategyGenerateFormValues;
  isSubmitting: boolean;
  onSubmit: (input: ValidatedStrategyGenerateInput) => void;
};

export function StrategyRegenerateDialog({
  open,
  onOpenChange,
  initialValues,
  isSubmitting,
  onSubmit,
}: StrategyRegenerateDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[rgba(10,10,10,0.22)]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[min(90vh,720px)] w-[calc(100vw-24px)] max-w-[640px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[12px] outline-none">
          <Dialog.Title className="sr-only">Regenerate strategy</Dialog.Title>
          <StrategyGenerateStep
            isSubmitting={isSubmitting}
            initialValues={initialValues}
            onSubmit={(input) => {
              onSubmit(input);
              onOpenChange(false);
            }}
            onCancel={() => onOpenChange(false)}
            title="Regenerate strategy"
            description="Replace all strategy sections and approvals. Research stays as-is."
            submitLabel="Replace strategy & run"
            warningMessage="This replaces the entire strategy artifact. Later steps are kept unless you clear them after the run."
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
