import * as Dialog from "@radix-ui/react-dialog";
import { SetupStepsDialog } from "@/components/ui/SetupStepsDialog";
import type { ToolConnections } from "@/hooks/settings/useToolConnections";
import { FIGMA_COMMUNITY_PLUGIN_URL } from "@/lib/settings/figmaPlugin";
import { openExternalLink } from "@/lib/settings/openExternalLink";
import { ProviderCliSetupDialog } from "./ProviderCliSetupDialog";

// The setup dialogs that `useToolConnections` opens (CLI setup, Figma plugin, Paper Desktop).
export function ToolConnectionDialogs({ connections }: { connections: ToolConnections }) {
  const { setupDialogProviderId, providers, providerRefresh } = connections;
  return (
    <>
      {setupDialogProviderId ? (
        <ProviderCliSetupDialog
          providerId={setupDialogProviderId}
          provider={providers.providerList.providers.find((entry) => entry.id === setupDialogProviderId)}
          isRefreshing={connections.isRefreshing}
          onClose={connections.closeSetupDialog}
          onRefresh={() => void providerRefresh.mutateAsync()}
          onConnect={connections.connectSetupDialogProvider}
        />
      ) : null}

      <FigmaExporterSetupDialog open={connections.figmaSetupOpen} onOpenChange={connections.setFigmaSetupOpen} />

      <PaperSetupDialog
        open={connections.paperSetupMessage !== null}
        message={connections.paperSetupMessage}
        onOpenChange={(open) => {
          if (!open) connections.closePaperSetup();
        }}
      />
    </>
  );
}

function FigmaExporterSetupDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const steps = [
    "Open the Stage plugin on Figma Community (approved listing).",
    "In Figma, install or run it once (Open in Figma / Try it out).",
    "When you export from Stage, run Plugins → Stage and enter the pairing code.",
  ];

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[rgba(10,10,10,0.22)]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100svh-32px)] w-[calc(100vw-32px)] max-w-[640px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25),0_18px_55px_rgba(10,10,10,0.22)] outline-none">
          <div className="p-3">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-white shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
                <img
                  src="/logos/integrations/figma.svg"
                  alt=""
                  aria-hidden="true"
                  className="h-5 w-[14px]"
                />
              </span>
              <div className="min-w-0">
                <Dialog.Title className="text-[15px] font-medium leading-[1.25] text-[#0A0A0A]">
                  Set up Stage for Figma
                </Dialog.Title>
                <Dialog.Description className="mt-1 text-[13px] font-medium leading-[1.45] text-[#525252]">
                  Install the official Community plugin once, then use the pairing code shown during export.
                </Dialog.Description>
              </div>
            </div>
          </div>

          <div className="grid gap-4 rounded-[8px] bg-white p-3 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] sm:grid-cols-[minmax(0,0.95fr)_minmax(240px,1.05fr)]">
            <ol className="grid content-start gap-3">
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

            <img
              src="/images/integrations/figma-integration.webp"
              alt="Stage Figma Community plugin"
              className="aspect-[1.36] w-full rounded-[8px] border border-[#E5E5E5] object-cover"
            />
          </div>

          <div className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() => {
                void openExternalLink(FIGMA_COMMUNITY_PLUGIN_URL);
              }}
              className="inline-flex h-[34px] items-center justify-center rounded-[6px] bg-[#171717] px-3 text-[13px] font-medium leading-none text-white shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#2A2A2A]"
            >
              Open in Figma Community
            </button>
            <Dialog.Close asChild>
              <button
                type="button"
                className="inline-flex h-[34px] items-center justify-center rounded-[6px] bg-white px-3 text-[13px] font-medium leading-none text-[#525252] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#FAFAFA]"
              >
                Done
              </button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function PaperSetupDialog({
  open,
  message,
  onOpenChange,
}: {
  open: boolean;
  message: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <SetupStepsDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Connect Paper Desktop first"
      description="First, please install the app and log in. Stage exports into the Paper file you have open."
      steps={[
        "Install Paper Desktop.",
        "Log in to the Paper account you want to export into.",
        "Open the target Paper file, then come back to Stage and refresh.",
      ]}
      note={message}
    />
  );
}
