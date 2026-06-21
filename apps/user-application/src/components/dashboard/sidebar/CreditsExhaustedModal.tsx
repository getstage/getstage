import * as Dialog from "@radix-ui/react-dialog";

type CreditsExhaustedModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContinueStart: () => void;
  onSeeOtherPlans: () => void;
};

const AI_USAGE_ROWS = [
  { label: "Voice Minutes", value: "60 / 60" },
  { label: "Mood Boards", value: "40 / 40" },
  { label: "References", value: "100 / 100" },
] as const;

export function CreditsExhaustedModal({
  open,
  onOpenChange,
  onContinueStart,
  onSeeOtherPlans,
}: CreditsExhaustedModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[rgba(0,0,0,0.1)] backdrop-blur-[5px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100svh-32px)] w-[calc(100vw-32px)] max-w-[348px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[12px] bg-[#F5F5F5] px-[4px] pt-[4px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] outline-none">
          <div className="flex w-full flex-col items-center gap-[10px] px-[12px] py-[16px]">
            <img
              src="/logos/two-sparkles.svg"
              alt=""
              aria-hidden="true"
              className="h-[20px] w-[20px] shrink-0"
            />
            <div className="flex w-full flex-col items-center text-center leading-[1.5]">
              <Dialog.Title className="w-[200px] text-[15px] font-medium text-[#0A0A0A]">
                You've used all available AI credits from your trial.
              </Dialog.Title>
              <Dialog.Description className="w-full text-[13px] font-normal text-[#525252]">
                Your projects, files, and workspace are untouched. Activate your plan to continue generating.
              </Dialog.Description>
            </div>
          </div>

          <div className="w-full">
            <div className="w-full rounded-[8px] border-[0.5px] border-[#D4D4D4] bg-white px-[12px] pb-[20px] pt-[16px] shadow-[0_0.45px_1px_rgba(10,10,10,0.05)]">
              <div className="flex w-full flex-col gap-[8px]">
                <p className="text-[13px] font-medium leading-none text-[#0A0A0A]">
                  AI Usage
                </p>
                <div className="flex w-full flex-col gap-[4px]">
                  {AI_USAGE_ROWS.map((row) => (
                    <div key={row.label} className="flex w-full items-center justify-between gap-3">
                      <p className="truncate text-[12px] font-medium leading-[1.5] text-[#404040]">
                        {row.label}
                      </p>
                      <p className="shrink-0 text-[11px] font-medium leading-[1.5] text-[#262626]">
                        {row.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex w-full items-center justify-end p-[6px]">
            <div className="flex min-w-0 flex-1 flex-col items-start gap-[6px]">
              <div className="flex w-full flex-col items-start gap-[6px]">
                <button
                  type="button"
                  onClick={onContinueStart}
                  className="flex h-[34px] w-full cursor-pointer items-center justify-center rounded-[6px] border-[0.5px] border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7B76DF] to-[#463FBA] px-[12px] py-[8px] text-[13px] font-medium leading-none text-[#FAFAFA] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] [text-shadow:0_0.5px_1.5px_rgba(0,0,0,0.15)]"
                >
                  Continue on Start - $19/mo
                </button>
                <button
                  type="button"
                  onClick={onSeeOtherPlans}
                  className="flex h-[34px] w-full cursor-pointer items-center justify-center rounded-[6px] border-[0.5px] border-[#D4D4D4] bg-white px-[12px] py-[8px] text-[13px] font-medium leading-none text-[#525252] shadow-[0_0.45px_1px_rgba(10,10,10,0.05)] transition-colors hover:bg-[#FAFAFA]"
                >
                  See Other Plans
                </button>
              </div>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="flex h-[34px] w-full cursor-pointer items-center justify-center px-[10px] py-[8px] text-[13px] font-medium leading-none text-[#737373] transition-colors hover:text-[#525252]"
              >
                Maybe Later
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
