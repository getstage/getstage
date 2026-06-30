import * as Dialog from "@radix-ui/react-dialog";
import type { ProviderId } from "@stage/data-ops/contracts";
import type { ResearchProviderOption } from "@/hooks/project/research/useResearchProviderSelection";
import type { ValidatedStrategyGenerateInput } from "@/lib/project/strategyGenerateInput";
import type { StrategyGenerateFormValues } from "@/lib/project/strategyGenerateInput";
import { StrategyGenerateStep } from "./tabs/strategy/StrategyGenerateStep";

type StrategyRegenerateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValues?: StrategyGenerateFormValues;
  isSubmitting: boolean;
  approvedSectionCount?: number;
  onSubmit: (input: ValidatedStrategyGenerateInput, providerId?: ProviderId) => void;
  providerOptions?: ResearchProviderOption[];
  selectedProviderId?: ProviderId | null;
  onSelectProvider?: (providerId: ProviderId) => void;
};

export function StrategyRegenerateDialog({
  open,
  onOpenChange,
  initialValues,
  isSubmitting,
  approvedSectionCount = 0,
  onSubmit,
  providerOptions,
  selectedProviderId,
  onSelectProvider,
}: StrategyRegenerateDialogProps) {
  const keepsApproved = approvedSectionCount > 0;
  const approvedLabel = `${approvedSectionCount} approved ${
    approvedSectionCount === 1 ? "section" : "sections"
  }`;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[rgba(10,10,10,0.22)]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[min(90vh,720px)] w-[calc(100vw-24px)] max-w-[640px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[12px] outline-none">
          <Dialog.Title className="sr-only">Regenerate strategy</Dialog.Title>
          <StrategyGenerateStep
            isSubmitting={isSubmitting}
            initialValues={initialValues}
            onSubmit={(input, providerId) => {
              onSubmit(input, providerId);
              onOpenChange(false);
            }}
            onCancel={() => onOpenChange(false)}
            title="Regenerate strategy"
            description={
              keepsApproved
                ? `Regenerate only the sections you haven't approved yet. Your ${approvedLabel} and the research stay as-is.`
                : "Replace all strategy sections and approvals. Research stays as-is."
            }
            submitLabel={keepsApproved ? "Regenerate unapproved & run" : "Replace strategy & run"}
            warningMessage={
              keepsApproved
                ? `Approved sections are kept. Only unapproved sections are regenerated. Later steps are kept unless you clear them after the run.`
                : "This replaces the entire strategy artifact. Later steps are kept unless you clear them after the run."
            }
            providerOptions={providerOptions}
            selectedProviderId={selectedProviderId}
            onSelectProvider={onSelectProvider}
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
