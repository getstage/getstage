import * as Dialog from "@radix-ui/react-dialog";
import type { UpstreamStaleKind } from "@/lib/project/upstreamStaleFlag";

type DownstreamStepsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  upstreamKind: UpstreamStaleKind;
  onKeep: () => void;
  onClear: () => void;
  isClearing?: boolean;
  errorMessage?: string | null;
};

function copyForKind(kind: UpstreamStaleKind) {
  if (kind === "research") {
    return {
      title: "Research was replaced",
      description:
        "Saved strategy is still there but may be out of date with the new research — open Strategy and regenerate if needed. You already have work on Moodboard, Flows, or Wireframes. Keep that work, or clear those steps and start fresh.",
    };
  }

  return {
    title: "Strategy was replaced",
    description:
      "Research is unchanged. You already have work on Moodboard, Flows, or Wireframes. Keep that work, or clear those steps and start fresh.",
  };
}

export function DownstreamStepsDialog({
  open,
  onOpenChange,
  upstreamKind,
  onKeep,
  onClear,
  isClearing = false,
  errorMessage = null,
}: DownstreamStepsDialogProps) {
  const copy = copyForKind(upstreamKind);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[rgba(10,10,10,0.22)]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-32px)] max-w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25),0_18px_55px_rgba(10,10,10,0.22)] outline-none">
          <div className="rounded-[8px] bg-white p-5">
            <Dialog.Title className="text-[15px] font-semibold text-[#171717]">
              {copy.title}
            </Dialog.Title>
            <Dialog.Description className="mt-2 text-[13px] font-medium leading-[1.5] text-[#525252]">
              {copy.description}
            </Dialog.Description>
            {errorMessage ? (
              <p className="mt-3 text-[13px] font-medium leading-[1.5] text-[#DC2626]">
                {errorMessage}
              </p>
            ) : null}
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onKeep}
                disabled={isClearing}
                className="inline-flex h-8 items-center rounded-[6px] border border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7B76DF] to-[#463FBA] px-3 text-[13px] font-medium text-[#FAFAFA] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] disabled:opacity-50"
              >
                Keep later steps
              </button>
              <button
                type="button"
                onClick={() => void onClear()}
                disabled={isClearing}
                className="inline-flex h-8 items-center rounded-[6px] bg-[#F5F5F5] px-3 text-[13px] font-medium text-[#171717] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] hover:bg-[#ECECEC] disabled:opacity-50"
              >
                {isClearing ? "Clearing…" : "Clear later steps"}
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
