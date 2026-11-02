import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { PencilSimpleLine, Plus, Sparkle, X } from "@phosphor-icons/react";
import type { ProviderId } from "@stage/data-ops/contracts";
import type { ResearchProviderOption } from "@/hooks/project/research/useResearchProviderSelection";
import { cn } from "@/lib/utils";

// STA-67, Figma 2534:3739 (Flow) and 2534:3978 (Sitemap): the user lists the screens or
// pages they want before generating. The list goes to the engine as a must-have list.
const SUGGESTIONS = {
  websites: ["Homepage", "Pricing Page", "Features"],
  apps: ["Onboarding", "Dashboard", "Invoice Creation"],
} as const;
const MAX_STEPS = 30;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isWebsite: boolean;
  isSubmitting: boolean;
  providerOptions: ResearchProviderOption[];
  selectedProviderId: ProviderId | null;
  onConfirm: (providerId: ProviderId, steps: string[]) => void;
};

export function CreateFlowsDialog({ open, onOpenChange, isWebsite, isSubmitting, providerOptions, selectedProviderId, onConfirm }: Props) {
  const [draft, setDraft] = useState("");
  const [steps, setSteps] = useState<string[]>([]);
  const [editing, setEditing] = useState<{ index: number; value: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const noun = isWebsite ? "Sitemap" : "Flow";
  const provider = providerOptions.find((option) => option.id === selectedProviderId);
  const suggestions = (isWebsite ? SUGGESTIONS.websites : SUGGESTIONS.apps).filter((suggestion) => !steps.includes(suggestion));

  useEffect(() => {
    if (open) return;
    setDraft("");
    setSteps([]);
    setEditing(null);
    setError(null);
  }, [open]);

  // "Dashboard, Invoices" adds two at once, as the placeholder suggests.
  function add(value: string) {
    const names = value.split(",").map((name) => name.trim()).filter(Boolean);
    setSteps((current) => [...current, ...names.filter((name) => !current.includes(name))].slice(0, MAX_STEPS));
    setDraft("");
  }

  function saveEdit() {
    if (!editing) return;
    const value = editing.value.trim();
    setSteps((current) => (value ? current.map((step, index) => (index === editing.index ? value : step)) : current.filter((_, index) => index !== editing.index)));
    setEditing(null);
  }

  function confirm() {
    if (!provider?.selectable) {
      setError(provider?.statusMessage ?? "Connect Claude or Codex in Integrations before generating.");
      return;
    }
    const pending = draft.split(",").map((name) => name.trim()).filter(Boolean);
    onConfirm(provider.id, [...steps, ...pending.filter((name) => !steps.includes(name))].slice(0, MAX_STEPS));
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[rgba(10,10,10,0.22)]" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 flex w-[calc(100vw-24px)] max-w-[546px] -translate-x-1/2 -translate-y-1/2 flex-col gap-1 overflow-hidden rounded-[12px] border-[0.5px] border-neutral-300 bg-neutral-100 p-1 shadow-[0_1px_4px_-3px_rgba(10,10,10,0.5)] outline-none">
          <div className="flex flex-col gap-1 p-4">
            <Dialog.Title className="text-[15px] font-medium text-neutral-900">Create {noun}</Dialog.Title>
            <Dialog.Description className="text-[13px] leading-[1.5] text-neutral-500">
              Customise your {noun.toLowerCase()} by giving more context.
            </Dialog.Description>
          </div>

          <div className="flex flex-col gap-11 rounded-[8px] border border-neutral-300 bg-white p-11 shadow-[0_1px_4px_-3px_rgba(10,10,10,0.5)] max-sm:p-6">
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <label htmlFor="create-flows-step" className="text-[13px] font-medium text-neutral-900">
                  {isWebsite ? "Add Web Pages" : "Add Screens"}
                </label>
                <form
                  className="flex items-stretch justify-between overflow-hidden rounded-[8px] border-[0.5px] border-neutral-300 bg-neutral-100 py-0.5 pr-0.5 pl-3 shadow-[0_1px_4px_-3px_rgba(10,10,10,0.5)]"
                  onSubmit={(event) => {
                    event.preventDefault();
                    add(draft);
                  }}
                >
                  <input
                    id="create-flows-step"
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder={isWebsite ? "e.g. Homepage, Pricing" : "e.g. Dashboard, Invoices"}
                    className="min-w-0 flex-1 bg-transparent text-[12px] font-medium text-neutral-800 outline-none placeholder:text-neutral-600"
                  />
                  <button
                    type="submit"
                    disabled={!draft.trim() || steps.length >= MAX_STEPS}
                    className="flex items-center gap-1.5 rounded-[6px] border border-neutral-600 bg-gradient-to-b from-neutral-700 to-neutral-950 py-2 pr-3 pl-2.5 text-[12px] font-medium text-neutral-50 shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] disabled:opacity-60"
                  >
                    <Plus size={16} aria-hidden="true" />
                    Add
                  </button>
                </form>
                {steps.length > 0 ? (
                  <ul className="flex flex-wrap gap-1" aria-label={isWebsite ? "Pages to include" : "Screens to include"}>
                    {steps.map((step, index) => (
                      <li key={step} className="flex items-center gap-2 rounded-full border-[0.5px] border-neutral-300 bg-white px-3 py-1.5 text-[12px] font-medium text-neutral-800 shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
                        {editing?.index === index ? (
                          <input
                            autoFocus
                            aria-label={`Rename ${step}`}
                            value={editing.value}
                            onChange={(event) => setEditing({ index, value: event.target.value })}
                            onBlur={saveEdit}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") saveEdit();
                              if (event.key === "Escape") {
                                event.stopPropagation();
                                setEditing(null);
                              }
                            }}
                            className="w-[120px] bg-transparent outline-none"
                          />
                        ) : (
                          <span>{step}</span>
                        )}
                        <button type="button" aria-label={`Rename ${step}`} onClick={() => setEditing({ index, value: step })} className="text-neutral-500 hover:text-neutral-800">
                          <PencilSimpleLine size={14} aria-hidden="true" />
                        </button>
                        <button type="button" aria-label={`Remove ${step}`} onClick={() => setSteps((current) => current.filter((_, i) => i !== index))} className="text-neutral-500 hover:text-neutral-800">
                          <X size={12} aria-hidden="true" />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>

              {suggestions.length > 0 ? (
                <div className="flex flex-col gap-2">
                  <p className="text-[13px] font-medium text-neutral-900">{isWebsite ? "Suggested Sitemaps" : "Suggested Flows"}</p>
                  <div className="flex flex-wrap gap-1">
                    {suggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => add(suggestion)}
                        className="rounded-full border-[0.5px] border-dashed border-neutral-400 bg-neutral-50 px-3 py-1.5 text-[12px] font-medium text-neutral-800 hover:bg-white"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            {error ? <p role="alert" className="-mt-8 text-[12px] text-red-600">{error}</p> : null}

            <div className="flex items-center justify-between">
              <Dialog.Close className="rounded-[6px] bg-neutral-100 py-2.5 pr-3 pl-2.5 text-[13px] font-medium text-neutral-600 shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] hover:bg-neutral-200">
                Cancel
              </Dialog.Close>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={confirm}
                className={cn(
                  "flex items-center gap-2 rounded-[6px] border border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7b76df] to-[#463fba] py-2.5 pr-3 pl-2.5 text-[13px] font-medium text-neutral-50 drop-shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]",
                  isSubmitting && "opacity-60",
                )}
              >
                <Sparkle size={15} weight="fill" aria-hidden="true" />
                {isSubmitting ? "Starting…" : `Create ${noun}`}
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
