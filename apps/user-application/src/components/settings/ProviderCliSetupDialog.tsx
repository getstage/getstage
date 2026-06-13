import { useState } from "react";
import type { ProviderId, ProviderStatusRecord } from "@stage/data-ops/contracts";
import {
  getProviderCliSetupSteps,
  providerCliSetupHeadline,
  providerCliSetupIssue,
  providerLabel,
} from "@/lib/settings/providerCliSetup";
import { PROVIDER_CLI_RESTART_BANNER } from "@/lib/settings/providerCliHints";

type ProviderCliSetupDialogProps = {
  providerId: ProviderId;
  provider: ProviderStatusRecord | undefined;
  isRefreshing: boolean;
  onClose: () => void;
  onRefresh: () => void;
  onConnect: () => void;
};

export function ProviderCliSetupDialog({
  providerId,
  provider,
  isRefreshing,
  onClose,
  onRefresh,
  onConnect,
}: ProviderCliSetupDialogProps) {
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);
  const issue = providerCliSetupIssue(provider);
  const steps = getProviderCliSetupSteps(providerId);
  const ready = issue === "ready";

  async function copyCommand(command: string) {
    await navigator.clipboard.writeText(command);
    setCopiedCommand(command);
    window.setTimeout(() => setCopiedCommand(null), 2000);
  }

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-[rgba(10,10,10,0.42)] px-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-labelledby="provider-cli-setup-title"
        className="w-full max-w-[520px] rounded-[12px] bg-white p-[20px] shadow-[0_18px_48px_rgba(10,10,10,0.18)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2
              id="provider-cli-setup-title"
              className="text-[16px] font-semibold leading-[1.25] text-[#0A0A0A]"
            >
              Set up {providerLabel(providerId)}
            </h2>
            <p className="mt-[6px] text-[13px] leading-[1.45] text-[#525252]">
              {providerCliSetupHeadline(providerId, issue)}. Stage uses your local CLI — you do not paste
              anything from Developer settings.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-[6px] px-2 py-1 text-[18px] leading-none text-[#737373] hover:bg-[#F5F5F5]"
          >
            ×
          </button>
        </div>

        <ol className="mt-[16px] space-y-[12px]">
          {steps.map((step, index) => (
            <li
              key={step.title}
              className="rounded-[8px] border border-[#EFEFEF] bg-[#FAFAFA] px-[12px] py-[10px]"
            >
              <p className="text-[12px] font-semibold text-[#171717]">
                {index + 1}. {step.title}
              </p>
              {step.command ? (
                <div className="mt-[8px] flex items-center justify-between gap-2 rounded-[6px] bg-[#171717] px-[10px] py-[8px]">
                  <code className="min-w-0 truncate font-mono text-[11px] text-[#FAFAFA]">
                    {step.command}
                  </code>
                  <button
                    type="button"
                    onClick={() => void copyCommand(step.command!)}
                    className="shrink-0 rounded-[5px] bg-[#404040] px-[8px] py-[4px] text-[11px] font-medium text-white hover:bg-[#525252]"
                  >
                    {copiedCommand === step.command ? "Copied" : "Copy"}
                  </button>
                </div>
              ) : null}
              <p className="mt-[6px] text-[12px] leading-[1.45] text-[#525252]">{step.detail}</p>
            </li>
          ))}
        </ol>

        {provider?.setupHint ? (
          <p className="mt-[12px] text-[12px] leading-[1.45] text-[#737373]">{provider.setupHint}</p>
        ) : null}

        <p className="mt-[12px] rounded-[8px] border border-[#F5E6B8] bg-[#FFFBEB] px-[12px] py-[10px] text-[12px] leading-[1.45] text-[#7A5B00]">
          {PROVIDER_CLI_RESTART_BANNER}
        </p>

        <div className="mt-[16px] flex flex-wrap justify-end gap-[8px]">
          <button
            type="button"
            onClick={onClose}
            className="h-[32px] rounded-[6px] px-[12px] text-[12px] font-medium text-[#525252] hover:bg-[#F5F5F5]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isRefreshing}
            onClick={onRefresh}
            className="h-[32px] rounded-[6px] bg-[#F5F5F5] px-[12px] text-[12px] font-medium text-[#171717] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] enabled:hover:bg-[#ECECEC] disabled:opacity-60"
          >
            {isRefreshing ? "Checking..." : "Refresh status"}
          </button>
          <button
            type="button"
            disabled={!ready}
            onClick={onConnect}
            className="h-[32px] rounded-[6px] bg-[#221E6C] px-[14px] text-[12px] font-medium text-white enabled:hover:bg-[#2F2A8F] disabled:cursor-not-allowed disabled:bg-[#A8A5D6]"
          >
            Connect {providerLabel(providerId)}
          </button>
        </div>
      </div>
    </div>
  );
}
