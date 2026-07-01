import * as Dialog from "@radix-ui/react-dialog";
import type { CreateFigmaExportResponse } from "@stage/data-ops/contracts";
import { PairingCodeCopy } from "@/components/ui/CopyButton";

type FigJamExportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: CreateFigmaExportResponse | null;
  jobStatus?: "requested" | "claimed" | "completed" | "failed" | undefined;
  destinationUrl?: string | null | undefined;
  errorMessage?: string | null | undefined;
};

export function FigJamExportDialog({
  open,
  onOpenChange,
  request,
  jobStatus,
  destinationUrl,
  errorMessage,
}: FigJamExportDialogProps) {
  if (!request) return null;

  const status = jobStatus ?? request.status;
  const isCompleted = status === "completed";
  const isFailed = status === "failed";
  const isWaiting = status === "requested" || status === "claimed";

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[rgba(10,10,10,0.22)]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-24px)] max-w-[440px] -translate-x-1/2 -translate-y-1/2 rounded-[12px] bg-white p-6 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] outline-none">
          <Dialog.Title className="text-[15px] font-medium leading-none text-[#171717]">
            {isCompleted ? "FigJam Export Complete" : "Send to FigJam"}
          </Dialog.Title>

          {isCompleted ? (
            <div className="mt-4">
              <Dialog.Description className="text-[13px] font-medium leading-[1.5] text-[#404040]">
                Your flow map has been exported to FigJam.
              </Dialog.Description>
              {destinationUrl ? (
                <a
                  href={destinationUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex h-[37px] items-center gap-2 rounded-[6px] border border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7B76DF] to-[#463FBA] px-3 text-[13px] font-medium leading-none text-[#FAFAFA] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]"
                >
                  Open in FigJam
                </a>
              ) : null}
            </div>
          ) : isFailed ? (
            <div className="mt-4">
              <Dialog.Description className="text-[13px] font-medium leading-[1.5] text-[#991B1B]">
                {errorMessage || "The export failed. Please try again."}
              </Dialog.Description>
            </div>
          ) : (
            <div className="mt-4">
              <Dialog.Description className="text-[13px] font-medium leading-[1.5] text-[#525252]">
                Open a FigJam board, run the Stage Exporter plugin, and enter the pairing code below.
              </Dialog.Description>
              <div className="mt-4 rounded-[8px] border border-[#E5E5E5] bg-[#F5F5F5] px-4 py-3">
                <PairingCodeCopy
                  value={request.pairingCode}
                  codeClassName="font-mono text-[24px] font-semibold tracking-[0.2em] text-[#171717]"
                />
              </div>
              <div className="mt-3 flex items-center gap-2 text-[12px] font-medium leading-[1.5] text-[#737373]">
                <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-[#16A34A]" />
                {status === "claimed" ? "Plugin connected — exporting…" : "Waiting for plugin…"}
              </div>
            </div>
          )}

          <div className="mt-6 flex items-center justify-end">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="inline-flex h-[37px] items-center rounded-[6px] bg-[#F5F5F5] px-3 text-[13px] font-medium leading-none text-[#525252] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#ECECEC]"
            >
              {isCompleted ? "Done" : "Close"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
