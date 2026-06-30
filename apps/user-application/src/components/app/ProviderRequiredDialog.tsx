import * as Dialog from "@radix-ui/react-dialog";
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "@tanstack/react-router";

const PROVIDER_ICONS = {
  claude: "/logos/integrations/claude.svg",
  codex: "/logos/integrations/codex.svg",
} as const;

function ProviderIconStack() {
  return (
    <div
      className="flex shrink-0 items-center gap-1.5 rounded-[8px] bg-white p-2 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]"
      aria-hidden="true"
    >
      <img src={PROVIDER_ICONS.claude} alt="" className="h-5 w-5 object-contain" />
      <img src={PROVIDER_ICONS.codex} alt="" className="h-5 w-5 object-contain" />
    </div>
  );
}

type ProviderRequiredContextValue = {
  // Show the popup explaining that no AI provider (Claude/Codex) is connected.
  // `message` is the preflight reason, already user-facing.
  show: (message: string) => void;
};

const NOOP: ProviderRequiredContextValue = { show: () => {} };

const ProviderRequiredContext = createContext<ProviderRequiredContextValue | null>(null);

// Safe outside the provider (e.g. the companion window) — falls back to a no-op
// so an AI run never crashes for lack of the dialog.
export function useProviderRequired(): ProviderRequiredContextValue {
  return useContext(ProviderRequiredContext) ?? NOOP;
}

export function ProviderRequiredProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const value = useMemo<ProviderRequiredContextValue>(() => ({ show: setMessage }), []);

  return (
    <ProviderRequiredContext.Provider value={value}>
      {children}
      <Dialog.Root
        open={message !== null}
        onOpenChange={(open) => {
          if (!open) setMessage(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-[rgba(10,10,10,0.22)]" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-32px)] max-w-[440px] -translate-x-1/2 -translate-y-1/2 rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25),0_18px_55px_rgba(10,10,10,0.22)] outline-none">
            <div className="flex items-start gap-3 p-3">
              <ProviderIconStack />
              <div className="min-w-0">
                <Dialog.Title className="text-[15px] font-medium leading-[1.5] text-[#0A0A0A]">
                  Connect an AI provider
                </Dialog.Title>
                <Dialog.Description className="mt-1 text-[13px] font-medium leading-[1.5] text-[#525252]">
                  Stage uses Claude or Codex to generate this. Neither is ready yet, so
                  the run can&apos;t start.
                </Dialog.Description>
              </div>
            </div>

            {message ? (
              <div className="mx-3 rounded-[8px] bg-white p-3 text-[13px] font-medium leading-[1.5] text-[#171717] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
                {message}
              </div>
            ) : null}

            <div className="flex items-center justify-between p-3">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="inline-flex h-[29px] cursor-pointer items-center justify-center rounded-[6px] bg-white px-3 text-[13px] font-medium leading-[1.25] text-[#525252] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#FAFAFA]"
                >
                  Not now
                </button>
              </Dialog.Close>

              <button
                type="button"
                onClick={() => {
                  setMessage(null);
                  void router.navigate({ to: "/integrations" });
                }}
                className="inline-flex h-[29px] cursor-pointer items-center justify-center gap-[10px] rounded-[6px] border border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7B76DF] to-[#463FBA] px-3 text-[13px] font-medium leading-[1.25] text-[#FAFAFA] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-opacity hover:opacity-90"
              >
                Open Integrations
              </button>
            </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  </ProviderRequiredContext.Provider>
  );
}
