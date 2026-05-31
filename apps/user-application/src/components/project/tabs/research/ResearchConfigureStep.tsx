import { useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { PlusIcon } from "./researchIcons";

type ResearchConfig = {
  industry: string;
  website: string;
  brief: string;
  notes: string;
  competitors: string[];
  briefFileName: string | null;
};

const DEFAULT_CONFIG: ResearchConfig = {
  industry: "",
  website: "",
  brief: "",
  notes: "",
  competitors: [],
  briefFileName: null,
};

const suggestedIndustries = "e.g. Fintech, E-commerce, SaaS, Health";

export function ResearchConfigureStep({
  isSubmitting,
  onSubmit,
}: {
  isSubmitting: boolean;
  onSubmit: (config: ResearchConfig) => void;
}) {
  const [config, setConfig] = useState<ResearchConfig>(DEFAULT_CONFIG);
  const [competitorInput, setCompetitorInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const canSubmit =
    config.industry.trim().length > 0 &&
    config.website.trim().length > 0 &&
    (config.brief.trim().length > 0 || config.briefFileName !== null);

  function updateField<Key extends keyof ResearchConfig>(key: Key, value: ResearchConfig[Key]) {
    setConfig((current) => ({ ...current, [key]: value }));
  }

  function addCompetitor() {
    const value = competitorInput.trim();
    if (!value) return;
    setConfig((current) => ({
      ...current,
      competitors: current.competitors.includes(value) ? current.competitors : [...current.competitors, value],
    }));
    setCompetitorInput("");
  }

  function removeCompetitor(value: string) {
    setConfig((current) => ({
      ...current,
      competitors: current.competitors.filter((item) => item !== value),
    }));
  }

  function handleBriefUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    updateField("briefFileName", file.name);
    event.target.value = "";
  }

  function handleCompetitorKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    addCompetitor();
  }

  function resetForm() {
    setConfig(DEFAULT_CONFIG);
    setCompetitorInput("");
  }

  return (
    <section className="rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
      <div className="rounded-[8px] bg-white shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
        <div className="flex w-full flex-col gap-1 rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
          <div className="flex items-center justify-center p-4">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <p className="text-[15px] font-medium leading-none text-[#171717]">Configure Research</p>
              <p className="max-w-[385px] text-[12px] font-medium leading-[1.5] text-[#737373]">
                Provide context about the client and their market. The more you give, the better the research.
              </p>
            </div>
          </div>

          <div className="rounded-[8px] bg-white px-11 py-11 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
            <div className="flex max-w-[560px] flex-col gap-6">
              <FormField label="Industry">
                <input
                  value={config.industry}
                  onChange={(event) => updateField("industry", event.target.value)}
                  placeholder={suggestedIndustries}
                  className="h-[40px] w-[290px] rounded-[6px] bg-[#F5F5F5] px-3 text-[12px] font-medium text-[#171717] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] outline-none placeholder:text-[#525252]"
                />
              </FormField>

              <FormField label="Client Website">
                <input
                  value={config.website}
                  onChange={(event) => updateField("website", event.target.value)}
                  placeholder="ex. www.google.com"
                  className="h-[40px] w-[290px] rounded-[6px] bg-[#F5F5F5] px-3 text-[12px] font-medium text-[#171717] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] outline-none placeholder:text-[#525252]"
                />
              </FormField>

              <FormField label="Project Brief or Context">
                <div className="flex h-[114px] w-full flex-col justify-between rounded-[6px] bg-[#F5F5F5] px-3 py-[10px] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
                  <textarea
                    value={config.brief}
                    onChange={(event) => updateField("brief", event.target.value)}
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
                    {config.briefFileName ? (
                      <span className="truncate text-[12px] font-medium text-[#525252]">{config.briefFileName}</span>
                    ) : null}
                  </div>
                </div>
              </FormField>

              <FormField label="Specific Competitors to include">
                <div className="flex flex-col gap-3">
                  <div className="flex w-[290px] items-center overflow-hidden rounded-[8px] bg-[#F5F5F5] pl-3 pr-[2px] py-[2px] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
                    <input
                      value={competitorInput}
                      onChange={(event) => setCompetitorInput(event.target.value)}
                      onKeyDown={handleCompetitorKeyDown}
                      placeholder="ex. www.competitor.com"
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
                  {config.competitors.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {config.competitors.map((competitor) => (
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

              <FormField label="Additional notes">
                <textarea
                  value={config.notes}
                  onChange={(event) => updateField("notes", event.target.value)}
                  placeholder="https://Baseframe.com"
                  className="h-[92px] w-[370px] rounded-[6px] bg-[#F5F5F5] p-3 text-[12px] font-medium text-[#171717] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] outline-none placeholder:text-[#525252]"
                />
              </FormField>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={resetForm}
                  className="inline-flex h-[37px] items-center rounded-[6px] bg-white px-[10px] pr-3 text-[13px] font-medium leading-none text-[#525252] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#FAFAFA]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!canSubmit || isSubmitting}
                  onClick={() => onSubmit(config)}
                  className="inline-flex h-[37px] items-center gap-2 rounded-[6px] border border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7B76DF] to-[#463FBA] pl-[10px] pr-3 text-[13px] font-medium leading-none text-[#FAFAFA] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] disabled:cursor-default disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Running Research
                    </>
                  ) : (
                    <>
                      <img src="/logos/dashboard/ai-generated.svg" alt="" aria-hidden="true" className="h-[15px] w-[15px] brightness-0 invert" />
                      Run Research
                    </>
                  )}
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
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex w-full flex-col gap-2">
      <p className="text-[13px] font-medium leading-none text-[#171717]">{label}</p>
      {children}
    </div>
  );
}
