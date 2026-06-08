import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { EXPORT_OPTIONS } from "@/lib/project/assetsTab";
import type { CreateFigmaExportResponse } from "@stage/data-ops/contracts";
import type { ExportOption, ExportOptionConfig, WireframeAssetCard } from "@/types/project/assetsTab";

export function ExportOptionsDialog({
  asset,
  open,
  onOpenChange,
  figmaConnected,
  exportRequest,
  exportJob,
  exportError,
  deliveryMessage,
  deliveryError,
  isExporting,
  onExportFigma,
  onExportDelivery,
}: {
  asset: WireframeAssetCard | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  figmaConnected: boolean;
  exportRequest: CreateFigmaExportResponse | null;
  exportJob:
    | {
        status: "requested" | "claimed" | "completed" | "failed";
        destinationUrl: string | null;
        errorMessage: string | null;
      }
    | null
    | undefined;
  exportError: string | null;
  deliveryMessage: string | null;
  deliveryError: string | null;
  isExporting: boolean;
  onExportFigma: (asset: WireframeAssetCard) => Promise<unknown>;
  onExportDelivery: (
    option: Exclude<ExportOption, "figma">,
    asset: WireframeAssetCard,
  ) => Promise<unknown>;
}) {
  const [selectedOption, setSelectedOption] = useState<ExportOption>("figma");
  const options = EXPORT_OPTIONS.map((item) =>
    item.id === "figma" ? { ...item, connected: figmaConnected } : item,
  );
  const option = options.find((item) => item.id === selectedOption) ?? options[2];
  const message = exportError ?? deliveryError ?? exportJob?.errorMessage;

  async function handleExport() {
    if (!asset) return;
    if (selectedOption === "figma") await onExportFigma(asset);
    else await onExportDelivery(selectedOption, asset);
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[rgba(10,10,10,0.22)]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-32px)] max-w-[518px] -translate-x-1/2 -translate-y-1/2 rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25),0_18px_55px_rgba(10,10,10,0.22)] outline-none">
          <div className="flex flex-col">
            <div className="flex flex-col justify-center p-3 font-medium leading-[1.5]">
              <Dialog.Title className="text-[15px] font-medium text-[#0A0A0A]">
                Export Options
              </Dialog.Title>
              <Dialog.Description className="text-[13px] font-medium text-[#525252]">
                Select how you want to export your assets.
              </Dialog.Description>
            </div>

            <div className="rounded-[8px] bg-white px-3 pb-5 pt-4 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
              <p className="text-[13px] font-medium leading-[1.25] text-[#171717]">
                How do you want to export?
              </p>
              <div className="mt-3 flex flex-col gap-4">
                {options.map((item) => (
                  <ExportOptionRow
                    key={item.id}
                    option={item}
                    selected={selectedOption === item.id}
                    onSelect={() => setSelectedOption(item.id)}
                  />
                ))}
              </div>
            </div>

            {exportRequest ? (
              <div className="mx-3 mt-3 rounded-[8px] bg-white p-3 text-[12px] text-[#404040] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.2)]">
                {exportJob?.status === "completed" ? (
                  <div className="flex items-center justify-between gap-3">
                    <span>Exported to Figma.</span>
                    {exportJob.destinationUrl ? (
                      <a
                        href={exportJob.destinationUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium underline"
                      >
                        Open in Figma
                      </a>
                    ) : null}
                  </div>
                ) : (
                  <>
                    <p className="font-medium text-[#171717]">Run the Stage Exporter plugin in Figma</p>
                    <p className="mt-1 text-[#525252]">Enter this one-time pairing code:</p>
                    <p className="mt-2 font-mono text-[20px] font-semibold tracking-[0.18em] text-[#171717]">
                      {exportRequest.pairingCode}
                    </p>
                    <p className="mt-2 text-[#737373]">
                      Status: {exportJob?.status ?? exportRequest.status}
                    </p>
                  </>
                )}
              </div>
            ) : null}

            {deliveryMessage ? (
              <p className="mx-3 mt-3 rounded-[6px] bg-[#F0FDF4] p-2 text-[12px] text-[#166534]">
                {deliveryMessage}
              </p>
            ) : null}

            {message ? (
              <p className="mx-3 mt-3 rounded-[6px] bg-[#FEF2F2] p-2 text-[12px] text-[#991B1B]">
                {message}
              </p>
            ) : null}

            <div className="flex items-center justify-between p-3">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="inline-flex h-[29px] cursor-pointer items-center justify-center rounded-[6px] bg-white px-3 text-[13px] font-medium leading-[1.25] text-[#525252] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#FAFAFA]"
                >
                  Done
                </button>
              </Dialog.Close>

              <button
                type="button"
                disabled={!option.connected || isExporting}
                onClick={() => void handleExport()}
                className="inline-flex h-[29px] cursor-pointer items-center justify-center gap-[10px] rounded-[6px] border border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7B76DF] to-[#463FBA] px-3 text-[13px] font-medium leading-[1.25] text-[#FAFAFA] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
                aria-label={asset ? `${option.actionLabel} ${asset.title}` : option.actionLabel}
              >
                <img src={option.iconSrc} alt="" className="h-[15px] w-[15px] shrink-0 object-contain" />
                {isExporting ? "Starting..." : option.actionLabel}
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function ExportOptionRow({
  option,
  selected,
  onSelect,
}: {
  option: ExportOptionConfig;
  selected: boolean;
  onSelect: () => void;
}) {
  const disabledDisconnected = !option.connected;

  return (
    <div className="flex min-h-[14px] items-center justify-between gap-3">
      <button
        type="button"
        onClick={onSelect}
        className={`flex min-w-0 cursor-pointer items-center gap-2 text-left text-[13px] font-medium leading-[1.25] ${
          disabledDisconnected ? "text-[#525252]" : "text-[#171717]"
        }`}
      >
        <span
          aria-hidden="true"
          className={`flex h-[14px] w-[14px] shrink-0 items-center justify-center rounded-full ${
            selected ? "bg-[#0A0A0A]" : disabledDisconnected ? "bg-[#0A0A0A]/20" : "bg-[#E5E5E5]"
          }`}
        >
          {selected ? <span className="h-[6px] w-[6px] rounded-full bg-[#FAFAFA]" /> : null}
        </span>
        <span className="truncate">{option.label}</span>
      </button>

      {disabledDisconnected ? (
        <button
          type="button"
          className="shrink-0 cursor-pointer text-[13px] font-medium leading-[1.25] text-[#171717] underline"
          onClick={(event) => event.stopPropagation()}
        >
          {option.connectLabel}
        </button>
      ) : null}
    </div>
  );
}
