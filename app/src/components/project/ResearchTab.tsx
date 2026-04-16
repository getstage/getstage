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
        <div className="mx-auto max-w-[940px] pt-4">
          <div className="mb-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#D97757]/15 bg-[#FFF5F0] px-3 py-1.5 text-[12px] font-medium text-[#D97757]">
              <img src="/claude.svg" alt="" className="h-3.5 w-3.5" />
              First run starts in Claude
            </div>
            <h2 className="mt-5 font-heading text-[34px] font-semibold tracking-[-0.04em] text-text-primary">
              Configure research
            </h2>
            <p className="mt-2 max-w-[760px] text-[16px] leading-[1.75] text-text-secondary">
              Provide context about the client and their market. The more you give, the better the first Claude research run will be.
            </p>
          </div>

          <div className="space-y-7 rounded-[24px] border border-border-subtle bg-white p-6 shadow-[0_12px_40px_rgba(17,24,39,0.04)] sm:p-8">
            <ContextInput
              label="Client website"
              type="url"
              value={clientWebsite}
              onChange={setClientWebsite}
              placeholder="https://acmestudio.com"
            />

            <div>
              <ContextTextarea
                label="Project brief or context"
                value={brief}
                onChange={setBrief}
                placeholder="Describe the project goals, target audience, or any specific direction you'd like the research to focus on..."
                minHeight="min-h-[128px]"
              />
              <p className="mt-2 text-[13px] text-text-tertiary">
                Optional — helps AI focus the research
              </p>
            </div>

            <div>
              <label className="mb-3 block text-[15px] font-medium text-text-primary">Upload a brief</label>
              <input
                ref={fileInputRef}
                type="file"
                accept={TASK_ATTACHMENT_ACCEPT}
                className="hidden"
                onChange={(event) => handleBriefFilePicked(event.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsDragActive(true);
                }}
                onDragLeave={() => setIsDragActive(false)}
                onDrop={handleBriefDrop}
                className={`flex w-full cursor-pointer items-center gap-4 rounded-[18px] border border-dashed px-5 py-5 text-left transition-all duration-150 ${
                  isDragActive
                    ? "border-accent bg-accent/5"
                    : "border-border-subtle bg-white hover:border-border"
                }`}
              >
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[16px] bg-bg-subtle text-text-tertiary">
                  <UploadSimple size={24} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[16px] font-medium text-accent">
                    Click to upload
                    <span className="text-text-secondary"> or drag a file here</span>
                  </span>
                  <span className="mt-1 block text-[14px] text-text-secondary">
                    PDF, DOCX, or TXT
                  </span>
                </span>
              </button>

              {briefAttachment ? (
                <div className="mt-3 flex flex-wrap items-center gap-2 rounded-[14px] border border-border-subtle bg-bg-subtle px-4 py-3">
                  <span className="inline-flex items-center gap-2 text-[14px] text-text-primary">
                    <img src="/claude.svg" alt="" className="h-4 w-4" />
                    {briefAttachment.name}
                  </span>
                  {briefAttachment.url ? (
                    <a
                      href={briefAttachment.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[13px] font-medium text-accent transition-colors hover:text-accent-hover"
                    >
                      Open
                    </a>
                  ) : null}
                  {!briefAttachment.persisted ? (
                    <span className="text-[12px] text-text-secondary">Uploads when you run research</span>
                  ) : null}
                  <button
                    type="button"
                    onClick={clearBriefAttachment}
                    className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-white text-text-secondary transition-colors hover:text-text-primary"
                    aria-label="Remove uploaded brief"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : null}

              {uploadError ? (
                <p className="mt-2 text-[13px] text-destructive">{uploadError}</p>
              ) : null}
            </div>

            <div>
              <label className="mb-3 block text-[15px] font-medium text-text-primary">
                Specific competitors to include
              </label>
              <div className="space-y-3">
                {competitorUrls.map((value, index) => (
                  <ContextInput
                    key={`competitor-${index}`}
                    type="url"
                    value={value}
                    onChange={(nextValue) =>
                      handleListValueChange(competitorUrls, index, nextValue, setCompetitorUrls)
                    }
                    placeholder="https://competitor.com"
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => addListValue(setCompetitorUrls, competitorUrls)}
                className="mt-3 inline-flex items-center gap-2 text-[15px] font-medium text-accent transition-colors hover:text-accent-hover"
              >
                <Plus size={16} weight="bold" />
                Add another competitor
              </button>
              <p className="mt-2 text-[13px] text-text-tertiary">
                Optional — AI will also discover competitors automatically
              </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <label className="mb-3 block text-[15px] font-medium text-text-primary">
                  Reference links
                </label>
                <div className="space-y-3">
                  {referenceUrls.map((value, index) => (
                    <ContextInput
                      key={`reference-${index}`}
                      type="url"
                      value={value}
                      onChange={(nextValue) =>
                        handleListValueChange(referenceUrls, index, nextValue, setReferenceUrls)
                      }
                      placeholder="https://reference.com"
                    />
                  ))}
                </div>
              </div>

              <div>
                <ContextTextarea
                  label="Additional notes"
                  value={notes}
                  onChange={setNotes}
                  placeholder="Extra context for the first research run"
                  minHeight="min-h-[154px]"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <ClaudeButton
                label={isLaunching ? "Launching..." : "Run Research"}
                disabled={isLaunching || isSaving}
                onClick={() => void launchResearchRun()}
              />
              <button
                type="button"
                onClick={onReturnToOverview}
                className="inline-flex h-12 items-center justify-center rounded-[12px] border border-border bg-white px-6 text-[15px] font-medium text-text-primary transition-colors hover:bg-bg-subtle"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>

        {runList.length > 0 ? (
          <div className="mx-auto mt-6 max-w-[940px]">
            <RunHistoryCard runList={runList} />
          </div>
        ) : null}
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
          <img src="/claude.svg" alt="" className="h-4 w-4" />
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
      className="inline-flex h-12 items-center justify-center gap-2 rounded-[12px] bg-accent px-6 text-[15px] font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
    >
      <img src="/claude.svg" alt="" className="h-4 w-4" />
      {label}
    </button>
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
