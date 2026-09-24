import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import {
  DETAILS_PAGE_SECTIONS,
  DETAILS_STRUCTURE_SECTIONS,
  REFERO_IOS_APP_SECTIONS,
  REFERO_WEB_APP_SECTIONS,
  type DetailsSection,
  type ProjectCategory,
  type ProviderId,
} from "@stage/data-ops/contracts";
import { useResearchProviderSelection } from "@/hooks/project/research/useResearchProviderSelection";
import {
  DEFAULT_RESEARCH_CONFIGURE_FORM_VALUES,
  isResearchConfigureFormSubmittable,
  normalizeReferenceSections,
  parseCompetitorWebsite,
  MAX_BRIEF_FILES,
  MAX_COMPETITORS,
  validateResearchConfigureForm,
  type ResearchConfigureFieldErrors,
  type ResearchConfigureFormValues,
  type ValidatedResearchConfigureInput,
} from "@/lib/project/researchConfigureInput";
import { validateUploadFile } from "@/lib/r2Uploads";
import { AiRunSettings } from "@/components/project/AiRunSettings";
import { PlusIcon } from "./researchIcons";

const suggestedIndustries = "e.g. Fintech, E-commerce, SaaS, Health";

function draftHasContent(draft: Partial<ResearchConfigureFormValues>) {
  return Boolean(
    draft.industry?.trim() ||
    draft.website?.trim() ||
    draft.projectBrief?.trim() ||
    draft.additionalNotes?.trim() ||
    (Array.isArray(draft.competitorUrls) && draft.competitorUrls.length > 0) ||
    (Array.isArray(draft.briefAttachments) && draft.briefAttachments.length > 0)
  );
}

function readResearchDraft(key: string): Partial<ResearchConfigureFormValues> | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ResearchConfigureFormValues>;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function ResearchConfigureStep({
  projectCategory,
  isSubmitting,
  initialValues = DEFAULT_RESEARCH_CONFIGURE_FORM_VALUES,
  onBriefFileChange,
  projectId,
  onClearBriefAttachment,
  onSubmit,
  onCancel,
  title = "Configure Research",
  description = "Provide context about the product and the market. The more you give, the better the research.",
  submitLabel = "Run Research",
  submitVariant = "primary",
  warningMessage,
}: {
  projectCategory: ProjectCategory;
  isSubmitting: boolean;
  initialValues?: ResearchConfigureFormValues;
  onBriefFileChange?: (files: File[]) => void;
  projectId?: string;
  onClearBriefAttachment?: () => void;
  onSubmit: (input: ValidatedResearchConfigureInput, providerId: ProviderId) => void;
  onCancel?: () => void;
  title?: string;
  description?: string;
  submitLabel?: string;
  submitVariant?: "primary" | "secondary";
  warningMessage?: string;
}) {
  const [values, setValues] = useState<ResearchConfigureFormValues>(() => ({
    ...initialValues,
    detailsSections: normalizeReferenceSections(initialValues.detailsSections, projectCategory),
  }));

  useEffect(() => {
    if (editingDraft.current) return;
    const draftKey = projectId ? `stage:research-draft:${projectId}` : null;
    const draft = draftKey ? readResearchDraft(draftKey) : null;
    const base = {
      ...initialValues,
      detailsSections: normalizeReferenceSections(initialValues.detailsSections, projectCategory),
    };
    const savedAttachments = (draft?.briefAttachments ?? []).filter(
      (file): file is ResearchConfigureFormValues["briefAttachments"][number] =>
        Boolean(
          file &&
            typeof file.name === "string" &&
            file.name.trim() &&
            typeof file.r2ObjectKey === "string" &&
            file.r2ObjectKey.trim(),
        ),
    );
    if (draft && draftHasContent(draft)) {
      setValues({
        ...base,
        ...draft,
        detailsSections: normalizeReferenceSections(
          draft.detailsSections ?? base.detailsSections,
          projectCategory,
        ),
        competitorUrls: Array.isArray(draft.competitorUrls)
          ? draft.competitorUrls.filter((url) => typeof url === "string")
          : base.competitorUrls,
        briefAttachments: savedAttachments,
        briefFileNames: savedAttachments.map((file) => file.name),
      });
      return;
    }
    setValues(base);
  }, [initialValues, projectCategory, projectId]);

  useEffect(() => {
    if (!projectId) return;
    if (!draftReady.current) {
      draftReady.current = true;
      return;
    }
    sessionStorage.setItem(
      `stage:research-draft:${projectId}`,
      JSON.stringify({
        industry: values.industry,
        website: values.website,
        projectBrief: values.projectBrief,
        additionalNotes: values.additionalNotes,
        competitorUrls: values.competitorUrls,
        detailsSections: values.detailsSections,
        briefFileNames: values.briefAttachments.map((file) => file.name),
        briefAttachments: values.briefAttachments,
      }),
    );
  }, [projectId, values]);
  const [competitorInput, setCompetitorInput] = useState("");
  const [fieldErrors, setFieldErrors] = useState<ResearchConfigureFieldErrors>({});
  const [providerError, setProviderError] = useState<string | null>(null);
  const [pendingBriefs, setPendingBriefs] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const draftReady = useRef(false);
  const editingDraft = useRef(false);
  const {
    selectedProviderId,
    selectProvider,
    providerOptions,
    canRunWithProvider,
  } = useResearchProviderSelection();

  const canSubmit = isResearchConfigureFormSubmittable(values) && canRunWithProvider;

  function updateField<Key extends keyof ResearchConfigureFormValues>(
    key: Key,
    value: ResearchConfigureFormValues[Key],
  ) {
    editingDraft.current = true;
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
    editingDraft.current = true;
    const parts = competitorInput.split(/[\s,]+/).map((part) => part.trim()).filter(Boolean);
    if (parts.length === 0) {
      setFieldErrors((current) => ({ ...current, competitorInput: "Enter a competitor website" }));
      return;
    }

    const next = [...values.competitorUrls];
    const invalid: string[] = [];
    for (const part of parts) {
      const parsed = parseCompetitorWebsite(part);
      if (!parsed.ok || next.includes(parsed.value)) {
        if (!parsed.ok) invalid.push(part);
        continue;
      }
      if (next.length >= MAX_COMPETITORS) {
        invalid.push(part);
        continue;
      }
      next.push(parsed.value);
    }

    setValues((current) => ({ ...current, competitorUrls: next }));
    setCompetitorInput(invalid.join(" "));
    setFieldErrors((current) => {
      const errors = { ...current };
      delete errors.competitorUrls;
      if (invalid.length > 0) {
        errors.competitorInput = "Check the skipped links. Use a full website address.";
      } else {
        delete errors.competitorInput;
      }
      if (next.length >= MAX_COMPETITORS && invalid.length > 0) {
        errors.competitorUrls = `Add up to ${MAX_COMPETITORS} competitors`;
      }
      return errors;
    });
  }

  function removeCompetitor(value: string) {
    editingDraft.current = true;
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
    const selected = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (selected.length === 0) return;

    const kept = [...pendingBriefs];
    const names = [...values.briefFileNames];
    let error: string | null = null;
    for (const file of selected) {
      if (names.length >= MAX_BRIEF_FILES) {
        error = `Add up to ${MAX_BRIEF_FILES} brief files.`;
        break;
      }
      const validationError = validateUploadFile("research-brief", file);
      if (validationError) {
        error = `${file.name}: ${validationError}`;
        continue;
      }
      if (names.includes(file.name)) continue;
      kept.push(file);
      names.push(file.name);
    }

    setPendingBriefs(kept);
    onBriefFileChange?.(kept);
    updateField("briefFileNames", names);
    setFieldErrors((current) => {
      const next = { ...current };
      if (error) next.projectBrief = error;
      else delete next.projectBrief;
      return next;
    });
  }

  function removeBrief(name: string) {
    editingDraft.current = true;
    const names = values.briefFileNames.filter((item) => item !== name);
    const kept = pendingBriefs.filter((file) => file.name !== name);
    const saved = values.briefAttachments.filter((file) => file.name !== name);
    setPendingBriefs(kept);
    onBriefFileChange?.(kept);
    setValues((current) => ({ ...current, briefFileNames: names, briefAttachments: saved }));
    if (names.length === 0) onClearBriefAttachment?.();
  }

  function handleCompetitorKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    addCompetitor();
  }

  function resetForm() {
    setPendingBriefs([]);
    onBriefFileChange?.([]);
    onClearBriefAttachment?.();
    setValues({
      ...DEFAULT_RESEARCH_CONFIGURE_FORM_VALUES,
      detailsSections: normalizeReferenceSections(
        DEFAULT_RESEARCH_CONFIGURE_FORM_VALUES.detailsSections,
        projectCategory,
      ),
    });
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
    if (projectId) sessionStorage.removeItem(`stage:research-draft:${projectId}`);
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

              <FormField label="Website" error={fieldErrors.website}>
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
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx,.txt,.md"
                      multiple
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
                    {values.briefFileNames.map((name) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => removeBrief(name)}
                        className="inline-flex max-w-[220px] items-center gap-2 rounded-full bg-white px-3 py-[6px] text-[12px] font-medium text-[#525252] shadow-[0_0.45px_1px_rgba(10,10,10,0.15)] transition-colors hover:bg-[#FAFAFA]"
                        title="Remove uploaded brief"
                      >
                        <span className="truncate">{name}</span>
                        <span className="shrink-0 text-[#A3A3A3]" aria-hidden="true">
                          ×
                        </span>
                        <span className="sr-only">Remove {name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </FormField>

              <FormField label="Specific Competitors to include" error={fieldErrors.competitorUrls} hint={`Up to ${MAX_COMPETITORS}. More than that times out the research run.`}>
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

              <FormField
                label={projectCategory === "websites" ? "Sections to analyze" : "Screens to analyze"}
                hint={
                  projectCategory === "websites"
                    ? "Pick page sections (hero, pricing, testimonials...). Stage collects how competitors design each one and surfaces the patterns they share."
                    : "Pick app screens. Stage collects how relevant products design each one and surfaces the patterns they share."
                }
                error={fieldErrors.detailsSections}
              >
                <ReferenceSectionPicker
                  projectCategory={projectCategory}
                  selected={values.detailsSections}
                  onChange={(detailsSections) => updateField("detailsSections", detailsSections)}
                />
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

function ReferenceSectionPicker({
  projectCategory,
  selected,
  onChange,
}: {
  projectCategory: ProjectCategory;
  selected: DetailsSection[];
  onChange: (sections: DetailsSection[]) => void;
}) {
  const selectionLabel =
    selected.length === 0
      ? "Choose sections"
      : `${selected.slice(0, 3).join(", ")}${selected.length > 3 ? ` +${selected.length - 3}` : ""}`;

  function toggle(section: DetailsSection) {
    if (selected.includes(section)) {
      if (selected.length > 1) {
        onChange(selected.filter((item) => item !== section));
      }
      return;
    }

    onChange([...selected, section]);
  }

  return (
    <details className="relative w-full max-w-[560px]">
      <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-4 rounded-[6px] bg-[#F5F5F5] px-4 text-[12px] font-medium text-[#171717] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] marker:content-none">
        <span className="min-w-0 truncate">{selectionLabel}</span>
        <span aria-hidden="true">⌄</span>
      </summary>
      <div className="absolute left-0 top-[50px] z-20 max-h-[360px] w-full overflow-y-auto rounded-[8px] bg-white p-3 shadow-[0_4px_18px_rgba(10,10,10,0.18)]">
        {projectCategory === "websites" ? (
          <>
            <SectionOptions
              title="Structure"
              options={DETAILS_STRUCTURE_SECTIONS}
              selected={selected}
              onToggle={toggle}
            />
            <SectionOptions
              title="Page sections"
              options={DETAILS_PAGE_SECTIONS}
              selected={selected}
              onToggle={toggle}
            />
          </>
        ) : (
          <SectionOptions
            title={projectCategory === "ios-apps" ? "iOS screens" : "Web app screens"}
            options={
              projectCategory === "ios-apps"
                ? REFERO_IOS_APP_SECTIONS
                : REFERO_WEB_APP_SECTIONS
            }
            selected={selected}
            onToggle={toggle}
            labels={
              projectCategory === "ios-apps"
                ? { Homepage: "Home", Pricing: "Paywall / Pricing" }
                : undefined
            }
          />
        )}
      </div>
    </details>
  );
}

function SectionOptions({
  title,
  options,
  selected,
  onToggle,
  labels,
}: {
  title: string;
  options: readonly DetailsSection[];
  selected: DetailsSection[];
  onToggle: (section: DetailsSection) => void;
  labels?: Partial<Record<DetailsSection, string>>;
}) {
  return (
    <fieldset className="mb-2 last:mb-0">
      <legend className="px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#A3A3A3]">
        {title}
      </legend>
      {options.map((section) => {
        const checked = selected.includes(section);
        const disabled = checked && selected.length === 1;
        return (
          <label
            key={section}
            className="flex min-h-[32px] cursor-pointer items-center gap-2 rounded-[5px] px-2 text-[12px] font-medium text-[#525252] hover:bg-[#F5F5F5] has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-45"
          >
            <input
              type="checkbox"
              checked={checked}
              disabled={disabled}
              onChange={() => onToggle(section)}
              className="accent-[#635BDF]"
            />
            {labels?.[section] ?? section}
          </label>
        );
      })}
    </fieldset>
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
