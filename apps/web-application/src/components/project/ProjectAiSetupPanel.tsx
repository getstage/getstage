import { useState } from "react";
import { Plus, UploadSimple } from "@phosphor-icons/react";

type ProjectAiSetupPanelProps = {
  isLaunching?: boolean;
  onRun: () => void;
  onCancel?: () => void;
};

export function ProjectAiSetupPanel({
  isLaunching,
  onRun,
  onCancel,
}: ProjectAiSetupPanelProps) {
  const [clientWebsite, setClientWebsite] = useState("");
  const [competitor, setCompetitor] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [brief, setBrief] = useState("");

  return (
    <div className="rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
      <div className="flex items-center justify-between gap-4 p-4">
        <div>
          <h2 className="text-[15px] font-medium text-[#171717]">Configure Research</h2>
          <p className="mt-1 max-w-[385px] text-[12px] font-medium leading-[1.5] text-[#737373]">
            Provide context about the client and their market. The more you give, the better the first Claude research run will be.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-[6px] border border-[rgba(217,119,87,0.25)] bg-[rgba(217,119,87,0.05)] px-2 py-1.5 text-[12px] font-medium text-[#D97757]">
          <img src="/logos/integrations/claude.svg" alt="" className="h-4 w-4" />
          First run starts with Claude
        </div>
      </div>

      <div className="flex items-start justify-between gap-10 rounded-[8px] bg-white p-11 shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <CompactInput label="Client Website" value={clientWebsite} onChange={setClientWebsite} placeholder="ex. www.google.com" />

          <label className="block">
            <span className="mb-2 block text-[13px] font-medium text-[#171717]">Upload a Brief</span>
            <button type="button" className="flex w-[282px] cursor-pointer items-start gap-3 rounded-[6px] bg-[#F5F5F5] px-3 py-2.5 text-left shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#EFEFEF]">
              <UploadSimple size={16} className="mt-0.5 shrink-0 text-[#525252]" />
              <span>
                <span className="block text-[12px] font-medium text-[#262626]">Upload Document</span>
                <span className="mt-1 block text-[12px] font-medium text-[#737373]">PDF, DOCX, PPT etc.</span>
              </span>
            </button>
          </label>

          <label className="block">
            <span className="mb-2 block text-[13px] font-medium text-[#171717]">Specific Competitors to include</span>
            <div className="flex w-[290px] items-center overflow-hidden rounded-[8px] bg-[#F5F5F5] p-0.5 shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
              <input value={competitor} onChange={(event) => setCompetitor(event.target.value)} placeholder="ex. www.google.com" className="min-w-0 flex-1 bg-transparent px-2.5 text-[12px] font-medium text-[#525252] outline-none placeholder:text-[#737373]" />
              <button type="button" className="inline-flex items-center gap-1.5 rounded-[6px] border border-[#525252] bg-gradient-to-b from-[#404040] to-[#0A0A0A] px-2.5 py-2 text-[12px] font-medium text-[#FAFAFA] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
                <Plus size={14} />
                Add
              </button>
            </div>
          </label>

          <CompactInput label="Reference links" value={reference} onChange={setReference} placeholder="ex. www.google.com" />
          <CompactTextarea label="Additional notes" value={notes} onChange={setNotes} placeholder="https://Baseframe.com" className="h-[92px] w-[370px]" />
          <CompactTextarea label="Project Brief or Context" value={brief} onChange={setBrief} placeholder="Type here..." className="h-[114px] w-full" />
        </div>

        <div className="flex shrink-0 items-start gap-3">
          <button type="button" disabled={isLaunching} onClick={onRun} className="inline-flex h-9 items-center justify-center gap-2 rounded-[6px] border border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7B76DF] to-[#463FBA] px-3 text-[13px] font-medium text-white shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60">
            <img src="/logos/integrations/claude.svg" alt="" className="h-4 w-4" />
            {isLaunching ? "Launching..." : "Run Research"}
          </button>
          <button type="button" onClick={onCancel} className="inline-flex h-9 items-center justify-center rounded-[6px] bg-white px-3 text-[13px] font-medium text-[#525252] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#F5F5F5]">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function CompactInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[13px] font-medium text-[#171717]">{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="h-9 w-[290px] rounded-[6px] bg-[#F5F5F5] px-3 text-[12px] font-medium text-[#525252] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] outline-none placeholder:text-[#737373] focus:bg-white" />
    </label>
  );
}

function CompactTextarea({
  label,
  value,
  onChange,
  placeholder,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[13px] font-medium text-[#171717]">{label}</span>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={`${className} resize-none rounded-[6px] bg-[#F5F5F5] p-3 text-[12px] font-medium text-[#525252] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] outline-none placeholder:text-[#737373] focus:bg-white`} />
    </label>
  );
}
