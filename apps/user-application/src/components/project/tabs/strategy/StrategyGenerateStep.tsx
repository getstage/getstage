import { useEffect, useState, type KeyboardEvent } from "react";
import type { ProviderId } from "@stage/data-ops/contracts";
import { AiRunSettings } from "@/components/project/AiRunSettings";
import { GenerateStrategyRunDialog } from "@/components/project/GenerateStrategyRunDialog";
import type { ResearchProviderOption } from "@/hooks/project/research/useResearchProviderSelection";
import {
  DEFAULT_STRATEGY_GENERATE_FORM_VALUES,
  isStrategyGenerateFormSubmittable,
  parseFocusArea,
  validateStrategyGenerateForm,
  type StrategyGenerateFieldErrors,
  type StrategyGenerateFormValues,
  type ValidatedStrategyGenerateInput,
} from "@/lib/project/strategyGenerateInput";
import { ArrowRightIcon, PlusIcon } from "./strategyIcons";

export function StrategyGenerateStep({
  isSubmitting,
  onSubmit,
  initialValues,
  onCancel,
  title = "Generate Strategy",
  description = "Turn your research into an actionable strategy. Add optional direction before generating.",
  submitLabel = "Generate Strategy",
  submitVariant = "primary",
  warningMessage,
  providerOptions,
  selectedProviderId,
  onSelectProvider,
  runSettingsInDialog = false,
}: {
  isSubmitting: boolean;
  onSubmit: (input: ValidatedStrategyGenerateInput, providerId?: ProviderId) => void;
  initialValues?: StrategyGenerateFormValues;
  onCancel?: () => void;
  title?: string;
  description?: string;
  submitLabel?: string;
  submitVariant?: "primary" | "secondary";
  warningMessage?: string;
  providerOptions?: ResearchProviderOption[];
  selectedProviderId?: ProviderId | null;
  onSelectProvider?: (providerId: ProviderId) => void;
  /** When true, provider/mode are chosen in a confirmation dialog on submit. */
  runSettingsInDialog?: boolean;
}) {
  const [values, setValues] = useState<StrategyGenerateFormValues>(
    initialValues ?? DEFAULT_STRATEGY_GENERATE_FORM_VALUES,
  );

  useEffect(() => {
    if (initialValues) {
      setValues(initialValues);
    }
  }, [initialValues]);
  const [focusInput, setFocusInput] = useState("");
  const [fieldErrors, setFieldErrors] = useState<StrategyGenerateFieldErrors>({});
  const [isRunDialogOpen, setIsRunDialogOpen] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState<ValidatedStrategyGenerateInput | null>(null);
  const requiresProvider = Boolean(providerOptions);
  const selectedProvider = providerOptions?.find((option) => option.id === selectedProviderId);
  const providerError =
    !runSettingsInDialog && requiresProvider && !selectedProviderId
      ? "Choose an AI provider before running Strategy."
      : !runSettingsInDialog && selectedProvider && !selectedProvider.selectable
        ? (selectedProvider.statusMessage ?? "This provider is not ready.")
        : undefined;
  const canSubmit =
    isStrategyGenerateFormSubmittable(values) &&
    (!requiresProvider || runSettingsInDialog || selectedProvider?.selectable === true);

  function updateNotes(nextValue: string) {
    setValues((current) => ({ ...current, additionalNotes: nextValue }));
    setFieldErrors((current) => {
      if (!current.additionalNotes) {
        return current;
      }

      const next = { ...current };
      delete next.additionalNotes;
      return next;
    });
  }

  function addFocusArea() {
    const parsed = parseFocusArea(focusInput);
    if (!parsed.ok) {
      setFieldErrors((current) => ({ ...current, focusInput: parsed.error }));
      return;
    }

    setValues((current) => {
      if (current.focusAreas.includes(parsed.value)) {
        setFieldErrors((errors) => ({
          ...errors,
          focusInput: "This focus area is already added",
        }));
        return current;
      }

      if (current.focusAreas.length >= 8) {
        setFieldErrors((errors) => ({
          ...errors,
          focusAreas: "Add up to 8 focus areas",
        }));
        return current;
      }

      return {
        ...current,
        focusAreas: [...current.focusAreas, parsed.value],
      };
    });

    setFocusInput("");
    setFieldErrors((current) => {
      const next = { ...current };
      delete next.focusInput;
      delete next.focusAreas;
      return next;
    });
  }

  function removeFocusArea(value: string) {
    setValues((current) => ({
      ...current,
      focusAreas: current.focusAreas.filter((item) => item !== value),
    }));
  }

  function handleFocusKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    addFocusArea();
  }

  function handleSubmit() {
    const result = validateStrategyGenerateForm(values);
    if (!result.success) {
      setFieldErrors(result.errors);
      return;
    }

    setFieldErrors({});

    if (runSettingsInDialog && providerOptions && onSelectProvider) {
      setPendingSubmit(result.data);
      setIsRunDialogOpen(true);
      return;
    }

    onSubmit(result.data, selectedProvider?.selectable ? selectedProvider.id : undefined);
  }

  function handleRunDialogConfirm(providerId: ProviderId) {
    if (!pendingSubmit) {
      return;
    }

    onSubmit(pendingSubmit, providerId);
    setPendingSubmit(null);
    setIsRunDialogOpen(false);
  }

  return (
    <section className="rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
      <div className="rounded-[8px] bg-white shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
        <div className="flex w-full flex-col gap-1 rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
          <div className="flex items-center justify-center p-4">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <p className="text-[15px] font-medium leading-none text-[#171717]">{title}</p>
              <p className="max-w-[420px] text-[12px] font-medium leading-[1.5] text-[#737373]">
                {description}
              </p>
            </div>
          </div>

          <div className="rounded-[8px] bg-white px-11 py-11 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
            <div className="flex max-w-[560px] flex-col gap-6">
              <FormField label="Focus areas" error={fieldErrors.focusAreas}>
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <div className="flex w-[290px] items-center overflow-hidden rounded-[8px] bg-[#F5F5F5] pl-3 pr-[2px] py-[2px] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
                      <input
                        value={focusInput}
                        onChange={(event) => {
                          setFocusInput(event.target.value);
                          setFieldErrors((current) => {
                            if (!current.focusInput) {
                              return current;
                            }

                            const next = { ...current };
                            delete next.focusInput;
                            return next;
                          });
                        }}
                        onKeyDown={handleFocusKeyDown}
                        placeholder="e.g. Onboarding, Mobile UX"
                        className="min-w-0 flex-1 bg-transparent text-[12px] font-medium text-[#171717] outline-none placeholder:text-[#525252]"
                      />
                      <button
                        type="button"
                        onClick={addFocusArea}
                        className="inline-flex h-[32px] items-center gap-[6px] rounded-[6px] border border-[#525252] bg-gradient-to-b from-[#404040] to-[#0A0A0A] pl-[10px] pr-3 text-[12px] font-medium leading-none text-[#FAFAFA] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]"
                      >
                        <PlusIcon />
                        Add
                      </button>
                    </div>
                    {fieldErrors.focusInput ? (
                      <FieldError message={fieldErrors.focusInput} />
                    ) : null}
                  </div>
                  {values.focusAreas.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {values.focusAreas.map((focusArea) => (
                        <button
                          key={focusArea}
                          type="button"
                          onClick={() => removeFocusArea(focusArea)}
                          className="inline-flex items-center gap-2 rounded-full bg-[#F5F5F5] px-3 py-[6px] text-[12px] font-medium text-[#525252] shadow-[0_0.45px_1px_rgba(10,10,10,0.15)]"
                        >
                          {focusArea}
                          <span className="text-[#A3A3A3]">x</span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </FormField>

              <FormField label="Additional direction" error={fieldErrors.additionalNotes}>
                <textarea
                  value={values.additionalNotes}
                  onChange={(event) => updateNotes(event.target.value)}
                  placeholder="Optional notes for the strategy run..."
                  className="h-[92px] w-[370px] rounded-[6px] bg-[#F5F5F5] p-3 text-[12px] font-medium text-[#171717] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] outline-none placeholder:text-[#525252]"
                />
              </FormField>

              {providerOptions && onSelectProvider && !runSettingsInDialog ? (
                <AiRunSettings
                  providerOptions={providerOptions}
                  selectedProviderId={selectedProviderId ?? null}
                  onSelectProvider={onSelectProvider}
                  providerError={providerError}
                />
              ) : null}

              {warningMessage ? (
                <p className="text-[12px] font-medium leading-[1.5] text-[#B45309]">{warningMessage}</p>
              ) : null}

              <div className="flex items-center gap-3">
                {onCancel ? (
                  <button
                    type="button"
                    onClick={onCancel}
                    disabled={isSubmitting}
                    className="inline-flex h-[37px] items-center rounded-[6px] bg-white px-[10px] pr-3 text-[13px] font-medium leading-none text-[#525252] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#FAFAFA] disabled:opacity-50"
                  >
                    Cancel
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={!canSubmit || isSubmitting}
                  onClick={handleSubmit}
                  className="inline-flex h-[37px] items-center gap-2 rounded-[6px] border border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7B76DF] to-[#463FBA] pl-[10px] pr-3 text-[13px] font-medium leading-none text-[#FAFAFA] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] disabled:cursor-default disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Running…
                    </>
                  ) : (
                    <>
                      <img src="/logos/dashboard/ai-generated.svg" alt="" aria-hidden="true" className="h-[15px] w-[15px] brightness-0 invert" />
                      {submitLabel}
                      <ArrowRightIcon />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {providerOptions && onSelectProvider && runSettingsInDialog ? (
        <GenerateStrategyRunDialog
          open={isRunDialogOpen}
          onOpenChange={(open) => {
            setIsRunDialogOpen(open);
            if (!open) {
              setPendingSubmit(null);
            }
          }}
          isSubmitting={isSubmitting}
          providerOptions={providerOptions}
          selectedProviderId={selectedProviderId ?? null}
          onSelectProvider={onSelectProvider}
          onConfirm={handleRunDialogConfirm}
        />
      ) : null}
    </section>
  );
}

function FormField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex w-full flex-col gap-2">
      <p className="text-[13px] font-medium leading-none text-[#171717]">{label}</p>
      {children}
      {error ? <FieldError message={error} /> : null}
    </div>
  );
}

function FieldError({ message }: { message: string }) {
  return <p className="text-[12px] font-medium leading-[1.4] text-[#DC2626]">{message}</p>;
}
