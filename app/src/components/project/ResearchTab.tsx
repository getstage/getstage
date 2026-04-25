import { useEffect, useRef, useState, type DragEvent, type ReactNode } from "react";
import { useMutation, useQuery } from "convex/react";
import { ArrowClockwise, Plus, ShareNetwork, UploadSimple, X } from "@phosphor-icons/react";
import { api } from "@/lib/convex";
import { TASK_ATTACHMENT_ACCEPT, uploadFileToR2, validateUploadFile } from "@/lib/r2Uploads";
import type { Id } from "../../../convex/_generated/dataModel";
import type { ProjectAiArtifact, ProjectAiContext, ProjectAiRun } from "@/types/ai";

type ResearchTabProps = {
  projectId: Id<"projects">;
  projectName: string;
  onReturnToOverview: () => void;
};

type BriefAttachmentState = {
  name: string;
  key: string | null;
  url: string | null;
  persisted: boolean;
};

export function ResearchTab({ projectId, projectName, onReturnToOverview }: ResearchTabProps) {
  const context = useQuery(api.projectAi.getContext, { projectId }) as ProjectAiContext | undefined;
  const runs = useQuery(api.projectAi.listRuns, { projectId, module: "research" });
  const artifacts = useQuery(api.projectAi.listArtifacts, { projectId, module: "research" });
  const upsertContext = useMutation(api.projectAi.upsertContext);
  const createRun = useMutation(api.projectAi.createRun);
  const r2GenerateUploadUrl = useMutation(api.r2.generateUploadUrl);
  const r2SyncMetadata = useMutation(api.r2.syncMetadata);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [clientWebsite, setClientWebsite] = useState("");
  const [brief, setBrief] = useState("");
  const [notes, setNotes] = useState("");
  const [competitorUrls, setCompetitorUrls] = useState<string[]>([""]);
  const [referenceUrls, setReferenceUrls] = useState<string[]>([""]);
  const [briefAttachment, setBriefAttachment] = useState<BriefAttachmentState | null>(null);
  const [pendingBriefFile, setPendingBriefFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);

  const runList: ProjectAiRun[] = runs ?? [];
  const artifactList: ProjectAiArtifact[] = artifacts ?? [];
  const latestArtifact = artifactList[0] ?? null;
  const latestRun = runList[0] ?? null;
  const hasResearchArtifact = latestArtifact !== null;
  const latestRunStatusLabel = formatRunStatus(latestRun?.status);

  useEffect(() => {
    if (!context) {
      return;
    }

    setClientWebsite(context.clientWebsite);
    setBrief(context.brief);
    setNotes(context.notes);
    setCompetitorUrls(withEmptyInput(context.competitorUrls));
    setReferenceUrls(withEmptyInput(context.referenceUrls));
    setBriefAttachment(
      context.briefAttachmentName || context.briefAttachmentUrl || context.briefAttachmentR2ObjectKey
        ? {
            name: context.briefAttachmentName ?? "Brief attachment",
            key: context.briefAttachmentR2ObjectKey,
            url: context.briefAttachmentUrl,
            persisted: true,
          }
        : null,
    );
    setPendingBriefFile(null);
    setUploadError(null);
  }, [context]);

  async function persistContext() {
    setIsSaving(true);
    setUploadError(null);

    try {
      let nextAttachmentName = briefAttachment?.name ?? null;
      let nextAttachmentKey = briefAttachment?.key ?? null;

      if (pendingBriefFile) {
        nextAttachmentKey = await uploadFileToR2({
          generateUploadUrl: r2GenerateUploadUrl,
          syncMetadata: r2SyncMetadata,
          purpose: "task-attachment",
          file: pendingBriefFile,
        });
        nextAttachmentName = pendingBriefFile.name;
      }

      await upsertContext({
        projectId,
        clientWebsite,
        competitorUrls: compactList(competitorUrls),
        referenceUrls: compactList(referenceUrls),
        brief,
        briefAttachmentName: nextAttachmentName,
        briefAttachmentR2ObjectKey: nextAttachmentKey,
        notes,
      });

      if (pendingBriefFile) {
        setBriefAttachment({
          name: pendingBriefFile.name,
          key: nextAttachmentKey,
          url: null,
          persisted: true,
        });
        setPendingBriefFile(null);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not save the research context.";
      setUploadError(message);
      throw error;
    } finally {
      setIsSaving(false);
    }
  }

  async function launchResearchRun() {
    setIsLaunching(true);
    try {
      await persistContext();
      const result = await createRun({
        projectId,
        module: "research",
        title: `${projectName} research run`,
        inputSummary: buildResearchSummary({
          clientWebsite,
          competitorUrls: compactList(competitorUrls),
          referenceUrls: compactList(referenceUrls),
          hasBriefAttachment: Boolean(briefAttachment || pendingBriefFile),
        }),
      });
      const nextUrl = `/agents/claude?source=settings&projectId=${projectId}&module=research&runId=${result.runId}`;
      window.location.assign(nextUrl);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not launch the Claude research run.";
      setUploadError(message);
    } finally {
      setIsLaunching(false);
    }
  }

  function handleListValueChange(
    values: string[],
    index: number,
    value: string,
    setter: (next: string[]) => void,
  ) {
    const next = [...values];
    next[index] = value;

    while (
      next.length > 1 &&
      (next[next.length - 1] ?? "").trim() === "" &&
      (next[next.length - 2] ?? "").trim() === ""
    ) {
      next.pop();
    }

    if (index === next.length - 1 && value.trim() !== "") {
      next.push("");
    }

    setter(next);
  }

  function addListValue(setter: (next: string[]) => void, values: string[]) {
    if (values[values.length - 1]?.trim() === "") {
      return;
    }
    setter([...values, ""]);
  }

  function handleBriefFilePicked(file: File | null) {
    if (!file) {
      return;
    }

    const validationError = validateUploadFile("task-attachment", file);
    if (validationError) {
      setUploadError(validationError);
      return;
    }

    setPendingBriefFile(file);
    setBriefAttachment({
      name: file.name,
      key: null,
      url: null,
      persisted: false,
    });
    setUploadError(null);
  }

  function handleBriefDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    setIsDragActive(false);
    handleBriefFilePicked(event.dataTransfer.files[0] ?? null);
  }

  function clearBriefAttachment() {
    setPendingBriefFile(null);
    setBriefAttachment(null);
    setUploadError(null);
  }

  if (!hasResearchArtifact) {
    return (
      <div className="pb-20">
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
              <CompactInput label="Client Website" type="url" value={clientWebsite} onChange={setClientWebsite} placeholder="ex. www.google.com" />

              <div>
                <label className="mb-2 block text-[13px] font-medium text-[#171717]">Upload a Brief</label>
                <input ref={fileInputRef} type="file" accept={TASK_ATTACHMENT_ACCEPT} className="hidden" onChange={(event) => handleBriefFilePicked(event.target.files?.[0] ?? null)} />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setIsDragActive(true);
                  }}
                  onDragLeave={() => setIsDragActive(false)}
                  onDrop={handleBriefDrop}
                  className={`flex w-[282px] cursor-pointer items-start gap-3 rounded-[6px] bg-[#F5F5F5] px-3 py-2.5 text-left shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] transition-colors ${isDragActive ? "bg-[#EEEDFE]" : "hover:bg-[#EFEFEF]"}`}
                >
                  <UploadSimple size={16} className="mt-0.5 shrink-0 text-[#525252]" />
                  <span>
                    <span className="block text-[12px] font-medium text-[#262626]">
                      {briefAttachment ? briefAttachment.name : "Upload Document"}
                    </span>
                    <span className="mt-1 block text-[12px] font-medium text-[#737373]">PDF, DOCX, PPT etc.</span>
                  </span>
                </button>
                {briefAttachment ? (
                  <button type="button" onClick={clearBriefAttachment} className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-destructive">
                    <X size={12} />
                    Remove brief
                  </button>
                ) : null}
                {uploadError ? <p className="mt-2 text-[12px] text-destructive">{uploadError}</p> : null}
              </div>

              <div>
                <label className="mb-2 block text-[13px] font-medium text-[#171717]">Specific Competitors to include</label>
                <div className="space-y-2">
                  {competitorUrls.map((value, index) => (
                    <div key={`competitor-${index}`} className="flex w-[290px] items-center overflow-hidden rounded-[8px] bg-[#F5F5F5] p-0.5 shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
                      <input
                        type="url"
                        value={value}
                        onChange={(event) => handleListValueChange(competitorUrls, index, event.target.value, setCompetitorUrls)}
                        placeholder="ex. www.google.com"
                        className="min-w-0 flex-1 bg-transparent px-2.5 text-[12px] font-medium text-[#525252] outline-none placeholder:text-[#737373]"
                      />
                      {index === competitorUrls.length - 1 ? (
                        <button type="button" onClick={() => addListValue(setCompetitorUrls, competitorUrls)} className="inline-flex items-center gap-1.5 rounded-[6px] border border-[#525252] bg-gradient-to-b from-[#404040] to-[#0A0A0A] px-2.5 py-2 text-[12px] font-medium text-[#FAFAFA] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
                          <Plus size={14} />
                          Add
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>

              <CompactInput label="Reference links" type="url" value={referenceUrls[0] ?? ""} onChange={(value) => handleListValueChange(referenceUrls, 0, value, setReferenceUrls)} placeholder="ex. www.google.com" />
              <CompactTextarea label="Additional notes" value={notes} onChange={setNotes} placeholder="https://Baseframe.com" className="h-[92px] w-[370px]" />
              <CompactTextarea label="Project Brief or Context" value={brief} onChange={setBrief} placeholder="Type here..." className="h-[114px] w-full" />
            </div>

            <div className="flex shrink-0 items-start gap-3">
              <ClaudeButton label={isLaunching ? "Launching..." : "Run Research"} disabled={isLaunching || isSaving} onClick={() => void launchResearchRun()} />
              <button type="button" onClick={onReturnToOverview} className="inline-flex h-9 items-center justify-center rounded-[6px] bg-white px-3 text-[13px] font-medium text-[#525252] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#F5F5F5]">
                Cancel
              </button>
            </div>
          </div>
        </div>

        {runList.length > 0 ? <div className="mt-6"><RunHistoryCard runList={runList} /></div> : null}
      </div>
    );
  }

  return (
      <div className="pb-20">
      <div className="flex flex-wrap items-center gap-2.5 py-6">
        <StatusBadge label={latestRunStatusLabel} tone={runStatusTone(latestRun?.status)} />
        <div className="flex-1" />
        <button
          type="button"
          className="inline-flex cursor-pointer items-center gap-2 rounded-[10px] border border-border bg-white px-4 py-2 text-[13px] font-medium text-text-primary transition-all duration-150 hover:bg-bg-subtle"
          onClick={() => void launchResearchRun()}
          disabled={isLaunching}
        >
          <img src="/logos/integrations/claude.svg" alt="" className="h-4 w-4" />
          {isLaunching ? "Launching..." : "Regenerate in Claude"}
        </button>
        <button
          type="button"
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-[8px] border border-border bg-transparent px-3.5 py-2 text-[13px] font-medium text-text-secondary transition-all duration-150 hover:border-text-secondary hover:text-text-primary"
          onClick={() => void navigator.clipboard.writeText(window.location.href)}
        >
          <ShareNetwork size={14} />
          Share
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <section className="space-y-4 rounded-[16px] border border-border-subtle bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-heading text-[18px] font-semibold text-text-primary">Research inputs</h2>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-[8px] border border-border px-3 py-1.5 text-[12px] font-medium text-text-primary transition-colors hover:bg-bg-subtle"
              onClick={() => void persistContext()}
              disabled={isSaving}
            >
              <ArrowClockwise size={12} />
              {isSaving ? "Saving..." : "Save"}
            </button>
          </div>

          <ContextInput
            label="Client website"
            type="url"
            value={clientWebsite}
            onChange={setClientWebsite}
            placeholder="https://client.com"
          />

          <Field label="Competitors">
            <div className="space-y-2">
              {competitorUrls.map((value, index) => (
                <ContextInput
                  key={`compact-competitor-${index}`}
                  type="url"
                  value={value}
                  onChange={(nextValue) =>
                    handleListValueChange(competitorUrls, index, nextValue, setCompetitorUrls)
                  }
                  placeholder="https://competitor.com"
                />
              ))}
            </div>
          </Field>

          <Field label="References">
            <div className="space-y-2">
              {referenceUrls.map((value, index) => (
                <ContextInput
                  key={`compact-reference-${index}`}
                  type="url"
                  value={value}
                  onChange={(nextValue) =>
                    handleListValueChange(referenceUrls, index, nextValue, setReferenceUrls)
                  }
                  placeholder="https://reference.com"
                />
              ))}
            </div>
          </Field>

          <ContextTextarea
            label="Brief"
            value={brief}
            onChange={setBrief}
            placeholder="What should Claude focus on?"
            minHeight="min-h-[110px]"
          />

          <ContextTextarea
            label="Notes"
            value={notes}
            onChange={setNotes}
            placeholder="Extra context for the research run"
            minHeight="min-h-[110px]"
          />

          {briefAttachment ? (
            <div className="rounded-[12px] border border-border-subtle bg-bg-subtle px-4 py-3">
              <div className="text-[12px] font-medium text-text-secondary">Brief attachment</div>
              <div className="mt-1 text-[14px] text-text-primary">{briefAttachment.name}</div>
            </div>
          ) : null}
        </section>

        <section className="space-y-6">
          <div className="rounded-[16px] border border-border-subtle bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-heading text-[18px] font-semibold text-text-primary">
                  Latest research
                </div>
                <div className="mt-1 text-[13px] text-text-secondary">
                  Updated {formatTimestamp(latestArtifact.updatedAt)}
                </div>
              </div>
              {latestRun ? (
                <span className="rounded-full bg-bg-subtle px-3 py-1 text-[12px] font-medium text-text-secondary">
                  {formatRunStatus(latestRun.status)}
                </span>
              ) : null}
            </div>

            <div className="mt-5 whitespace-pre-wrap text-[14px] leading-[1.75] text-text-secondary">
              {latestArtifact.contentMarkdown ||
                latestArtifact.summary ||
                latestArtifact.contentJson ||
                "This artifact has no display content yet."}
            </div>
          </div>

          <RunHistoryCard runList={runList} />
        </section>
      </div>
    </div>
  );
}

function ClaudeButton({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-9 items-center justify-center gap-2 rounded-[6px] border border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7B76DF] to-[#463FBA] px-3 text-[13px] font-medium text-white shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <img src="/logos/integrations/claude.svg" alt="" className="h-4 w-4" />
      {label}
    </button>
  );
}

function CompactInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[13px] font-medium text-[#171717]">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-9 w-[290px] rounded-[6px] bg-[#F5F5F5] px-3 text-[12px] font-medium text-[#525252] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] outline-none placeholder:text-[#737373] focus:bg-white"
      />
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
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={`${className} resize-none rounded-[6px] bg-[#F5F5F5] p-3 text-[12px] font-medium text-[#525252] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] outline-none placeholder:text-[#737373] focus:bg-white`}
      />
    </label>
  );
}

function ContextInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
}) {
  return (
    <div>
      {label ? <label className="mb-3 block text-[15px] font-medium text-text-primary">{label}</label> : null}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-14 w-full rounded-[14px] border border-border bg-white px-5 text-[15px] text-text-primary outline-none transition-colors duration-150 placeholder:text-text-tertiary focus:border-accent"
      />
    </div>
  );
}

function ContextTextarea({
  label,
  value,
  onChange,
  placeholder,
  minHeight,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  minHeight: string;
}) {
  return (
    <div>
      <label className="mb-3 block text-[15px] font-medium text-text-primary">{label}</label>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={`${minHeight} w-full rounded-[14px] border border-border bg-white px-5 py-4 text-[15px] text-text-primary outline-none transition-colors duration-150 placeholder:text-text-tertiary focus:border-accent`}
      />
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-text-primary">{label}</span>
      {children}
    </label>
  );
}

function StatusBadge({ label, tone = "success" }: { label: string; tone?: "success" | "neutral" | "warning" | "danger" }) {
  const classes =
    tone === "warning"
      ? "bg-[#FEF9EC] text-[#D4890A]"
      : tone === "danger"
        ? "bg-[#FDECEC] text-[#D64545]"
        : tone === "neutral"
          ? "bg-bg-subtle text-text-secondary"
          : "bg-[#EDFCF2] text-[#22C55E]";

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-medium ${classes}`}>
      {label}
    </span>
  );
}

function RunHistoryCard({ runList }: { runList: ProjectAiRun[] }) {
  return (
    <div className="rounded-[16px] border border-border-subtle bg-white p-5">
      <div className="font-heading text-[18px] font-semibold text-text-primary">Run history</div>
      <div className="mt-4 space-y-3">
        {runList.length > 0 ? (
          runList.map((run) => (
            <div
              key={run.id}
              className="flex items-center justify-between gap-3 rounded-[12px] border border-border-subtle px-4 py-3"
            >
              <div>
                <div className="text-[14px] font-medium text-text-primary">{run.title}</div>
                <div className="mt-1 text-[12px] text-text-secondary">
                  {formatTimestamp(run.startedAt)} · {run.trigger}
                </div>
              </div>
              <span className="rounded-full bg-bg-subtle px-2.5 py-1 text-[12px] font-medium text-text-secondary">
                {formatRunStatus(run.status)}
              </span>
            </div>
          ))
        ) : (
          <div className="text-[14px] text-text-secondary">No runs yet.</div>
        )}
      </div>
    </div>
  );
}

function withEmptyInput(values: string[]) {
  return values.length > 0 ? [...values, ""] : [""];
}

function compactList(values: string[]) {
  return values
    .map((value) => value.trim())
    .filter(Boolean);
}

function buildResearchSummary(args: {
  clientWebsite: string;
  competitorUrls: string[];
  referenceUrls: string[];
  hasBriefAttachment: boolean;
}) {
  return [
    `Website: ${args.clientWebsite || "n/a"}`,
    `Competitors: ${args.competitorUrls.length}`,
    `References: ${args.referenceUrls.length}`,
    `Brief file: ${args.hasBriefAttachment ? "yes" : "no"}`,
  ].join(" · ");
}

function formatTimestamp(value: number | null | undefined) {
  if (!value) {
    return "Never";
  }

  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatRunStatus(status: ProjectAiRun["status"] | undefined) {
  switch (status) {
    case "draft":
      return "Awaiting Claude";
    case "running":
      return "Running";
    case "needs_input":
      return "Needs input";
    case "failed":
      return "Failed";
    case "completed":
      return "Complete";
    default:
      return "Ready";
  }
}

function runStatusTone(status: ProjectAiRun["status"] | undefined): "success" | "neutral" | "warning" | "danger" {
  switch (status) {
    case "draft":
      return "neutral";
    case "needs_input":
      return "warning";
    case "failed":
      return "danger";
    default:
      return "success";
  }
}
