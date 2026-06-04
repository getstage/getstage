import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import type { ProviderId } from "@stage/data-ops/contracts";
import { AiRunSettings } from "@/components/project/AiRunSettings";
import type { ResearchProviderOption } from "@/hooks/project/research/useResearchProviderSelection";
import { ArrowRightIcon } from "@/components/project/tabs/strategy/strategyIcons";

type GenerateStrategyRunDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  confirmLabel?: string;
  isSubmitting?: boolean;
  providerOptions: ResearchProviderOption[];
  selectedProviderId: ProviderId | null;
  onSelectProvider: (providerId: ProviderId) => void;
  onConfirm: (providerId: ProviderId) => void;
};

export function GenerateStrategyRunDialog({
  open,
  onOpenChange,
  title = "Generate Strategy",
  description = "Turn your research into an actionable strategy. Choose provider and mode, then start the run.",
  confirmLabel = "Generate Strategy",
  isSubmitting = false,
  providerOptions,
  selectedProviderId,
  onSelectProvider,
  onConfirm,
}: GenerateStrategyRunDialogProps) {
  const [providerError, setProviderError] = useState<string | null>(null);
  const selectedProvider = providerOptions.find((option) => option.id === selectedProviderId);

  useEffect(() => {
    if (!open) {
      setProviderError(null);
    }
  }, [open]);

  function handleConfirm() {
    if (!selectedProvider?.selectable) {
      setProviderError(
        selectedProvider?.statusMessage ?? "Choose a connected provider before continuing.",
      );
      return;
    }

    setProviderError(null);
    onConfirm(selectedProvider.id);
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[rgba(10,10,10,0.22)]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-24px)] max-w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-[12px] bg-white p-6 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] outline-none">
          <Dialog.Title className="text-[15px] font-medium leading-none text-[#171717]">
            {title}
          </Dialog.Title>
          <Dialog.Description className="mt-2 text-[12px] font-medium leading-[1.5] text-[#737373]">
            {description}
          </Dialog.Description>

          <div className="mt-6">
            <AiRunSettings
              providerOptions={providerOptions}
              selectedProviderId={selectedProviderId}
              onSelectProvider={(providerId) => {
                onSelectProvider(providerId);
                setProviderError(null);
              }}
              providerError={providerError ?? undefined}
            />
          </div>

          <div className="mt-6 flex items-center justify-end gap-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => onOpenChange(false)}
              className="inline-flex h-[37px] items-center rounded-[6px] bg-[#F5F5F5] px-3 text-[13px] font-medium leading-none text-[#525252] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#ECECEC] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSubmitting || !selectedProvider?.selectable}
              onClick={handleConfirm}
              className="inline-flex h-[37px] items-center gap-2 rounded-[6px] border border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7B76DF] to-[#463FBA] pl-[10px] pr-3 text-[13px] font-medium leading-none text-[#FAFAFA] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Running…
                </>
              ) : (
                <>
                  <img
                    src="/logos/dashboard/ai-generated.svg"
                    alt=""
                    aria-hidden="true"
                    className="h-[15px] w-[15px] brightness-0 invert"
                  />
                  {confirmLabel}
                  <ArrowRightIcon />
                </>
              )}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
