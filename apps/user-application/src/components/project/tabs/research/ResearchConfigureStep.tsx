import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import type { ProviderId } from "@stage/data-ops/contracts";
import { useResearchProviderSelection } from "@/hooks/project/research/useResearchProviderSelection";
import {
  DEFAULT_RESEARCH_CONFIGURE_FORM_VALUES,
  isResearchConfigureFormSubmittable,
  parseCompetitorWebsite,
  validateResearchConfigureForm,
  type ResearchConfigureFieldErrors,
  type ResearchConfigureFormValues,
  type ValidatedResearchConfigureInput,
} from "@/lib/project/researchConfigureInput";
import { validateUploadFile } from "@/lib/r2Uploads";
import { AiRunSettings } from "@/components/project/AiRunSettings";
import { PlusIcon } from "./researchIcons";

const suggestedIndustries = "e.g. Fintech, E-commerce, SaaS, Health";

export function ResearchConfigureStep({
  isSubmitting,
  initialValues = DEFAULT_RESEARCH_CONFIGURE_FORM_VALUES,
  onBriefFileChange,
  onClearBriefAttachment,
  onSubmit,
  onCancel,
  title = "Configure Research",
  description = "Provide context about the client and their market. The more you give, the better the research.",
  submitLabel = "Run Research",
  submitVariant = "primary",
  warningMessage,
}: {
  isSubmitting: boolean;
  initialValues?: ResearchConfigureFormValues;
  onBriefFileChange?: (file: File | null) => void;
  onClearBriefAttachment?: () => void;
  onSubmit: (input: ValidatedResearchConfigureInput, providerId: ProviderId) => void;
  onCancel?: () => void;
  title?: string;
  description?: string;
  submitLabel?: string;
  submitVariant?: "primary" | "secondary";
  warningMessage?: string;
}) {
  const [values, setValues] = useState<ResearchConfigureFormValues>(initialValues);

  useEffect(() => {
    setValues(initialValues);
  }, [initialValues]);
  const [competitorInput, setCompetitorInput] = useState("");
  const [fieldErrors, setFieldErrors] = useState<ResearchConfigureFieldErrors>({});
  const [providerError, setProviderError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const {
    selectedProviderId,
    selectProvider,
    providerOptions,
    canRunWithProvider,
  } = useResearchProviderSelection();

  useEffect(() => {
    setValues(initialValues);
  }, [initialValues]);

  const canSubmit = isResearchConfigureFormSubmittable(values) && canRunWithProvider;

  function updateField<Key extends keyof ResearchConfigureFormValues>(
    key: Key,
    value: ResearchConfigureFormValues[Key],
  ) {
    setValues((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => {
      if (!current[key]) {
        return current;
      }

      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function addCompetitor() {
    const parsed = parseCompetitorWebsite(competitorInput);
    if (!parsed.ok) {
      setFieldErrors((current) => ({ ...current, competitorInput: parsed.error }));
      return;
    }

    setValues((current) => {
      if (current.competitorUrls.includes(parsed.value)) {
        setFieldErrors((errors) => ({
          ...errors,
          competitorInput: "This competitor is already added",
        }));
        return current;
      }

      if (current.competitorUrls.length >= 10) {
        setFieldErrors((errors) => ({
          ...errors,
          competitorUrls: "Add up to 10 competitors",
        }));
        return current;
      }

      return {
        ...current,
        competitorUrls: [...current.competitorUrls, parsed.value],
      };
    });

    setCompetitorInput("");
    setFieldErrors((current) => {
      const next = { ...current };
      delete next.competitorInput;
      delete next.competitorUrls;
      return next;
    });
  }

  function removeCompetitor(value: string) {
    setValues((current) => ({
      ...current,
      competitorUrls: current.competitorUrls.filter((item) => item !== value),
    }));
    setFieldErrors((current) => {
      if (!current.competitorUrls) {
        return current;
      }

      const next = { ...current };
      delete next.competitorUrls;
      return next;
    });
  }

  function handleBriefUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const validationError = validateUploadFile("research-brief", file);
    if (validationError) {
      onBriefFileChange?.(null);
      setFieldErrors((current) => ({ ...current, projectBrief: validationError }));
      event.target.value = "";
      return;
    }

    updateField("briefFileName", file.name);
    onBriefFileChange?.(file);
    setFieldErrors((current) => {
      if (!current.projectBrief) {
        return current;
      }

      const next = { ...current };
      delete next.projectBrief;
      return next;
    });
    event.target.value = "";
  }

  function clearBriefAttachment() {
    updateField("briefFileName", null);
    onBriefFileChange?.(null);
    onClearBriefAttachment?.();
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setFieldErrors((current) => {
      if (!current.projectBrief) {
        return current;
      }

      const next = { ...current };
      delete next.projectBrief;
      return next;
    });
  }

  function handleCompetitorKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    addCompetitor();
  }

  function resetForm() {
    clearBriefAttachment();
    setValues(DEFAULT_RESEARCH_CONFIGURE_FORM_VALUES);
    setCompetitorInput("");
    setFieldErrors({});
  }

  function handleSubmit() {
    const result = validateResearchConfigureForm(values);
    if (!result.success) {
      setFieldErrors(result.errors);
      return;
    }

    if (!selectedProviderId || !canRunWithProvider) {
      setProviderError("Choose Claude or Codex to run Research.");
      return;
    }

    setFieldErrors({});
    setProviderError(null);
    onSubmit(result.data, selectedProviderId);
  }

  return (
    <section className="rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
      <div className="rounded-[8px] bg-white shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
        <div className="flex w-full flex-col gap-1 rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
          <div className="flex items-center justify-center p-4">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <p className="text-[15px] font-medium leading-none text-[#171717]">{title}</p>
              <p className="max-w-[385px] text-[12px] font-medium leading-[1.5] text-[#737373]">
                {description}
              </p>
            </div>
          </div>

          <div className="rounded-[8px] bg-white px-11 py-11 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
            <div className="flex max-w-[560px] flex-col gap-6">
              <FormField label="Industry" error={fieldErrors.industry}>
                <input
                  value={values.industry}
                  onChange={(event) => updateField("industry", event.target.value)}
                  placeholder={suggestedIndustries}
                  className="h-[40px] w-[290px] rounded-[6px] bg-[#F5F5F5] px-3 text-[12px] font-medium text-[#171717] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] outline-none placeholder:text-[#525252]"
                />
              </FormField>

              <FormField label="Client Website" error={fieldErrors.website}>
                <input
                  value={values.website}
                  onChange={(event) => updateField("website", event.target.value)}
                  placeholder="ex. www.google.com"
                  inputMode="url"
                  className="h-[40px] w-[290px] rounded-[6px] bg-[#F5F5F5] px-3 text-[12px] font-medium text-[#171717] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] outline-none placeholder:text-[#525252]"
                />
              </FormField>

              <FormField
                label="Project Brief or Context"
                hint="Be specific — what the product does, who it's for, and what makes it different. The clearer this is, the more tailored (and less generic) your research references will be."
                error={fieldErrors.projectBrief}
              >
                <div className="flex h-[114px] w-full flex-col justify-between rounded-[6px] bg-[#F5F5F5] px-3 py-[10px] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
                  <textarea
                    value={values.projectBrief}
                    onChange={(event) => updateField("projectBrief", event.target.value)}
                    placeholder="Type here..."
                    className="h-full w-full resize-none bg-transparent text-[12px] font-medium text-[#171717] outline-none placeholder:text-[#525252]"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx,.txt,.md"
                      onChange={handleBriefUpload}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex h-[31px] items-center gap-2 rounded-[6px] bg-white px-[10px] pr-3 text-[13px] font-medium leading-none text-[#171717] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#FAFAFA]"
                    >
                      <img src="/logos/upload-brief.svg" alt="" aria-hidden="true" className="h-4 w-4" />
                      Upload Brief
                    </button>
                    {values.briefFileName ? (
                      <button
                        type="button"
                        onClick={clearBriefAttachment}
                        className="inline-flex max-w-[220px] items-center gap-2 rounded-full bg-white px-3 py-[6px] text-[12px] font-medium text-[#525252] shadow-[0_0.45px_1px_rgba(10,10,10,0.15)] transition-colors hover:bg-[#FAFAFA]"
                        title="Remove uploaded brief"
                      >
                        <span className="truncate">{values.briefFileName}</span>
                        <span className="shrink-0 text-[#A3A3A3]" aria-hidden="true">
                          ×
                        </span>
                        <span className="sr-only">Remove brief</span>
                      </button>
                    ) : null}
                  </div>
                </div>
              </FormField>

              <FormField label="Specific Competitors to include" error={fieldErrors.competitorUrls}>
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <div className="flex w-[290px] items-center overflow-hidden rounded-[8px] bg-[#F5F5F5] pl-3 pr-[2px] py-[2px] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
                      <input
                        value={competitorInput}
                        onChange={(event) => {
                          setCompetitorInput(event.target.value);
                          setFieldErrors((current) => {
                            if (!current.competitorInput) {
                              return current;
                            }

                            const next = { ...current };
                            delete next.competitorInput;
                            return next;
                          });
                        }}
                        onKeyDown={handleCompetitorKeyDown}
                        placeholder="ex. www.competitor.com"
                        inputMode="url"
                        className="min-w-0 flex-1 bg-transparent text-[12px] font-medium text-[#171717] outline-none placeholder:text-[#525252]"
                      />
                      <button
                        type="button"
                        onClick={addCompetitor}
                        className="inline-flex h-[32px] items-center gap-[6px] rounded-[6px] border border-[#525252] bg-gradient-to-b from-[#404040] to-[#0A0A0A] pl-[10px] pr-3 text-[12px] font-medium leading-none text-[#FAFAFA] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]"
                      >
                        <PlusIcon />
                        Add
                      </button>
                    </div>
                    {fieldErrors.competitorInput ? (
                      <FieldError message={fieldErrors.competitorInput} />
                    ) : null}
                  </div>
                  {values.competitorUrls.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {values.competitorUrls.map((competitor) => (
                        <button
                          key={competitor}
                          type="button"
                          onClick={() => removeCompetitor(competitor)}
                          className="inline-flex items-center gap-2 rounded-full bg-[#F5F5F5] px-3 py-[6px] text-[12px] font-medium text-[#525252] shadow-[0_0.45px_1px_rgba(10,10,10,0.15)]"
                        >
                          {competitor}
                          <span className="text-[#A3A3A3]">x</span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </FormField>

              <FormField label="Additional notes" error={fieldErrors.additionalNotes}>
                <textarea
                  value={values.additionalNotes}
                  onChange={(event) => updateField("additionalNotes", event.target.value)}
                  placeholder="Optional context, links, or constraints"
                  className="h-[92px] w-[370px] rounded-[6px] bg-[#F5F5F5] p-3 text-[12px] font-medium text-[#171717] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] outline-none placeholder:text-[#525252]"
                />
              </FormField>

              <AiRunSettings
                providerOptions={providerOptions}
                selectedProviderId={selectedProviderId}
                onSelectProvider={(providerId) => {
                  selectProvider(providerId);
                  setProviderError(null);
                }}
                providerError={providerError ?? undefined}
              />

              {warningMessage ? (
                <p className="text-[12px] font-medium leading-[1.5] text-[#B45309]">{warningMessage}</p>
              ) : null}

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onCancel ?? resetForm}
                  className="inline-flex h-[37px] items-center rounded-[6px] bg-white px-[10px] pr-3 text-[13px] font-medium leading-none text-[#525252] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#FAFAFA]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!canSubmit || isSubmitting}
                  onClick={handleSubmit}
                  className={
                    submitVariant === "secondary"
                      ? "inline-flex h-[37px] items-center gap-2 rounded-[6px] bg-[#F5F5F5] py-2 pl-[10px] pr-3 text-[13px] font-medium leading-none text-[#525252] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#ECECEC] disabled:cursor-not-allowed disabled:opacity-50"
                      : "inline-flex h-[37px] items-center gap-2 rounded-[6px] border border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7B76DF] to-[#463FBA] pl-[10px] pr-3 text-[13px] font-medium leading-none text-[#FAFAFA] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] disabled:cursor-default disabled:opacity-50"
                  }
                >
                  {submitVariant === "primary" ? (
                    <img
                      src="/logos/dashboard/ai-generated.svg"
                      alt=""
                      aria-hidden="true"
                      className="h-[15px] w-[15px] brightness-0 invert"
                    />
                  ) : null}
                  {isSubmitting ? "Running…" : submitLabel}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FormField({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex w-full flex-col gap-2">
      <p className="text-[13px] font-medium leading-none text-[#171717]">{label}</p>
      {hint ? (
        <p className="max-w-[385px] text-[12px] font-medium leading-[1.5] text-[#737373]">{hint}</p>
      ) : null}
      {children}
      {error ? <FieldError message={error} /> : null}
    </div>
  );
}

function FieldError({ message }: { message: string }) {
  return <p className="text-[12px] font-medium leading-[1.4] text-[#DC2626]">{message}</p>;
}
