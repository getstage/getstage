import { useEffect, useRef, useState, type DragEvent } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowClockwise,
  ArrowRight,
  FloppyDisk,
  Globe,
  NotePencil,
  Plus,
  ShareNetwork,
  Sparkle,
  Trash,
  UploadSimple,
  X,
} from "@phosphor-icons/react";
import { api } from "@/lib/convex";
import { TASK_ATTACHMENT_ACCEPT, uploadFileToR2, validateUploadFile } from "@/lib/r2Uploads";
import {
  artifactText,
  ClaudeMark,
  FieldLabel,
  formatTimestamp,
  ModulePanel,
  PrimaryButton,
  runStatusLabel,
  runStatusTone,
  SecondaryButton,
  splitMarkdownSections,
  StatusPill,
  TextArea,
  TextInput,
  WhiteCard,
} from "@/components/project/ProjectAiModulePrimitives";
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
  const requestArtifactDestination = useMutation(api.projectAi.requestArtifactDestination);
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
  const [isEditing, setIsEditing] = useState(false);
  const [editingSections, setEditingSections] = useState<Array<{ title: string; body: string }>>([]);

  const runList: ProjectAiRun[] = runs ?? [];
  const artifactList: ProjectAiArtifact[] = artifacts ?? [];
  const latestArtifact = artifactList[0] ?? null;
  const latestRun = runList[0] ?? null;
  const hasResearchArtifact = latestArtifact !== null;
  const latestRunStatusLabel = runStatusLabel(latestRun?.status);

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

  useEffect(() => {
    setIsEditing(false);
    setEditingSections([]);
  }, [latestArtifact?.id]);

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
      window.location.assign(`/agents/claude?source=settings&projectId=${projectId}&module=research&runId=${result.runId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not launch the Claude research run.";
      setUploadError(message);
    } finally {
      setIsLaunching(false);
    }
  }

  async function sendToNotion() {
    if (!latestArtifact) {
      return;
    }

    await requestArtifactDestination({
      artifactId: latestArtifact.id as Id<"projectAiArtifacts">,
      provider: "notion",
      action: "export_to_notion",
    });
    window.location.assign(`/agents/claude?source=settings&projectId=${projectId}&artifactId=${latestArtifact.id}&provider=notion&action=export_to_notion`);
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

  function removeListValue(values: string[], index: number, setter: (next: string[]) => void) {
    const next = values.filter((_, itemIndex) => itemIndex !== index);
    setter(withEmptyInput(compactList(next)));
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
        <ModulePanel
          title="Configure Research"
          description="Provide context about the client and their market. The more you give, the better the first Claude research run will be."
          bodyClassName="p-6 sm:p-11"
        >
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 flex-1 flex-col gap-6">
              <div className="max-w-[290px]">
                <FieldLabel>Client Website</FieldLabel>
                <TextInput type="url" value={clientWebsite} onChange={setClientWebsite} placeholder="ex. www.google.com" />
              </div>

              <div className="max-w-[770px]">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                  <FieldLabel>Project Brief or Context</FieldLabel>
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
                    className={`inline-flex h-8 items-center gap-2 rounded-[6px] bg-[#F5F5F5] px-3 text-[12px] font-medium text-[#525252] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] transition-colors ${isDragActive ? "bg-[#EEEDFE]" : "hover:bg-[#EFEFEF]"}`}
                  >
                    <UploadSimple size={14} />
                    {briefAttachment ? briefAttachment.name : "Upload Brief"}
                  </button>
                </div>
                <TextArea value={brief} onChange={setBrief} placeholder="Type here..." className="h-[114px]" />
                {briefAttachment ? (
                  <button type="button" onClick={clearBriefAttachment} className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-destructive">
                    <X size={12} />
                    Remove brief
                  </button>
                ) : null}
                {uploadError ? <p className="mt-2 text-[12px] text-destructive">{uploadError}</p> : null}
              </div>

              <div className="max-w-[360px]">
                <FieldLabel>Specific Competitors to include</FieldLabel>
                <div className="space-y-2">
                  {competitorUrls.map((value, index) => (
                    <div key={`competitor-${index}`} className="flex items-center gap-2">
                      <TextInput
                        type="url"
                        value={value}
                        onChange={(nextValue) => handleListValueChange(competitorUrls, index, nextValue, setCompetitorUrls)}
                        placeholder="ex. www.google.com"
                      />
                      {index === competitorUrls.length - 1 ? (
                        <button type="button" onClick={() => addListValue(setCompetitorUrls, competitorUrls)} className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[6px] border border-[#525252] bg-gradient-to-b from-[#404040] to-[#0A0A0A] px-2.5 text-[12px] font-medium text-[#FAFAFA] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
                          <Plus size={14} />
                          Add
                        </button>
                      ) : value.trim() ? (
                        <button type="button" onClick={() => removeListValue(competitorUrls, index, setCompetitorUrls)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] text-destructive transition-colors hover:bg-[#FDECEC]" aria-label="Remove competitor">
                          <Trash size={14} weight="fill" />
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>

              <div className="max-w-[360px]">
                <FieldLabel>Reference links</FieldLabel>
                <div className="space-y-2">
                  {referenceUrls.map((value, index) => (
                    <div key={`reference-${index}`} className="flex items-center gap-2">
                      <TextInput
                        type="url"
                        value={value}
                        onChange={(nextValue) => handleListValueChange(referenceUrls, index, nextValue, setReferenceUrls)}
                        placeholder="ex. www.google.com"
                      />
                      {index === referenceUrls.length - 1 ? (
                        <button type="button" onClick={() => addListValue(setReferenceUrls, referenceUrls)} className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[6px] border border-[#525252] bg-gradient-to-b from-[#404040] to-[#0A0A0A] px-2.5 text-[12px] font-medium text-[#FAFAFA] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
                          <Plus size={14} />
                          Add
                        </button>
                      ) : value.trim() ? (
                        <button type="button" onClick={() => removeListValue(referenceUrls, index, setReferenceUrls)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] text-destructive transition-colors hover:bg-[#FDECEC]" aria-label="Remove reference">
                          <Trash size={14} weight="fill" />
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>

              <div className="max-w-[370px]">
                <FieldLabel>Additional notes</FieldLabel>
                <TextArea value={notes} onChange={setNotes} placeholder="https://Baseframe.com" className="h-[92px]" />
              </div>
            </div>

            <div className="flex shrink-0 items-start gap-3">
              <PrimaryButton onClick={() => void launchResearchRun()} disabled={isLaunching || isSaving}>
                <ClaudeMark />
                {isLaunching ? "Launching..." : "Run Research"}
              </PrimaryButton>
              <SecondaryButton onClick={onReturnToOverview}>Cancel</SecondaryButton>
            </div>
          </div>
        </ModulePanel>
      </div>
    );
  }

  const sections = splitMarkdownSections(artifactText(latestArtifact), "Company Overview");

  function enterEditMode() {
    setEditingSections(sections.map((s) => ({ ...s })));
    setIsEditing(true);
  }

  function discardEdits() {
    setEditingSections([]);
    setIsEditing(false);
  }

  function updateEditingSection(index: number, body: string) {
    setEditingSections((prev) => prev.map((s, i) => (i === index ? { ...s, body } : s)));
  }

  return (
    <div className="pb-20">
      <div className="mb-8 flex flex-wrap items-center gap-2.5">
        <StatusPill tone={runStatusTone(latestRun?.status)}>{latestRunStatusLabel}</StatusPill>
        <div className="flex-1" />
        <PrimaryButton onClick={() => void launchResearchRun()} disabled={isLaunching}>
          <ClaudeMark />
          {isLaunching ? "Launching..." : "Regenerate in Claude"}
        </PrimaryButton>
        <SecondaryButton onClick={() => void navigator.clipboard.writeText(window.location.href)}>
          <ShareNetwork size={14} />
          Share
        </SecondaryButton>
      </div>

      <ModulePanel bodyClassName="p-5 sm:p-11">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-[22px] font-semibold leading-none text-[#171717]">Latest research</h2>
            <p className="mt-2 text-[13px] font-medium text-[#737373]">
              Updated {formatTimestamp(latestArtifact.updatedAt)}
            </p>
          </div>
          {isEditing ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={discardEdits}
                className="inline-flex h-9 items-center gap-2 rounded-[6px] px-3 text-[13px] font-medium text-destructive transition-colors hover:bg-[#FDECEC]"
              >
                Discard Changes
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-[6px] border border-[#22C55E] bg-gradient-to-b from-[#22C55E] to-[#16A34A] px-3 text-[13px] font-medium text-white shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] transition-opacity hover:opacity-95"
              >
                <FloppyDisk size={14} />
                Save Changes
              </button>
            </div>
          ) : (
            <SecondaryButton onClick={enterEditMode}>
              <NotePencil size={14} />
              Edit Research
            </SecondaryButton>
          )}
        </div>

        {isEditing ? (
          <div className="mt-8 space-y-4">
            {editingSections.map((section, index) => (
              <div key={index} className="rounded-[10px] bg-[#F5F5F5] p-5">
                <h3 className="mb-3 text-[17px] font-semibold leading-none text-[#171717]">{section.title}</h3>
                <TextArea
                  value={section.body}
                  onChange={(v) => updateEditingSection(index, v)}
                  className="min-h-[120px] text-[13px]"
                />
                <button
                  type="button"
                  className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-[#7B76DF] transition-opacity hover:opacity-80"
                >
                  <Sparkle size={14} weight="fill" />
                  Regenerate with AI
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            {sections.map((section, index) => {
              const titleLower = section.title.toLowerCase();

              if (titleLower.includes("competitor")) {
                const competitors = parseCompetitorCards(section.body);
                if (competitors.length > 0) {
                  return (
                    <div key={`${section.title}-${index}`}>
                      <h3 className="mb-4 text-[17px] font-semibold leading-none text-[#171717]">{section.title}</h3>
                      <div className="grid gap-4 lg:grid-cols-2">
                        {competitors.map((comp, ci) => (
                          <WhiteCard key={ci} className="p-5">
                            <div className="flex items-start gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F5F5F5]">
                                <Globe size={18} className="text-[#737373]" />
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-[15px] font-semibold leading-none text-[#171717]">{comp.name}</h4>
                                {comp.domain ? (
                                  <p className="mt-1.5 text-[12px] font-medium text-[#7B76DF]">{comp.domain}</p>
                                ) : null}
                                {comp.tagline ? (
                                  <p className="mt-1 text-[13px] font-medium leading-[1.5] text-[#737373]">{comp.tagline}</p>
                                ) : null}
                              </div>
                            </div>

                            {comp.strengths.length > 0 ? (
                              <div className="mt-4">
                                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#22C55E]">Strengths</span>
                                <div className="mt-2 rounded-[8px] bg-[#EDFCF2] p-3">
                                  <ul className="space-y-1.5">
                                    {comp.strengths.map((s, si) => (
                                      <li key={si} className="flex items-start gap-2 text-[13px] font-medium leading-[1.5] text-[#525252]">
                                        <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-[#22C55E]" />
                                        {s}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            ) : null}

                            {comp.weaknesses.length > 0 ? (
                              <div className="mt-3">
                                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#D64545]">Weaknesses</span>
                                <div className="mt-2 rounded-[8px] bg-[#FDECEC] p-3">
                                  <ul className="space-y-1.5">
                                    {comp.weaknesses.map((w, wi) => (
                                      <li key={wi} className="flex items-start gap-2 text-[13px] font-medium leading-[1.5] text-[#525252]">
                                        <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-[#D64545]" />
                                        {w}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            ) : null}

                            <button
                              type="button"
                              className="mt-4 text-[13px] font-medium text-[#7B76DF] transition-opacity hover:opacity-80"
                            >
                              See more
                            </button>
                          </WhiteCard>
                        ))}
                      </div>
                    </div>
                  );
                }
              }

              if (titleLower.includes("opportunit")) {
                const bullets = parseBulletPoints(section.body);
                return (
                  <div key={`${section.title}-${index}`} className="rounded-[10px] bg-[#F5F5F5] p-5">
                    <h3 className="text-[17px] font-semibold leading-none text-[#171717]">{section.title}</h3>
                    {bullets.length > 0 ? (
                      <ul className="mt-3 space-y-2">
                        {bullets.map((b, bi) => (
                          <li key={bi} className="flex items-start gap-2 text-[14px] font-medium leading-[1.7] text-[#737373]">
                            <span className="mt-[10px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#737373]" />
                            {b}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-3 whitespace-pre-wrap text-[14px] font-medium leading-[1.7] text-[#737373]">
                        {section.body || "No content available yet."}
                      </p>
                    )}
                  </div>
                );
              }

              if (titleLower.includes("key insight")) {
                const bullets = parseBulletPoints(section.body);
                return (
                  <WhiteCard key={`${section.title}-${index}`} className="p-5">
                    <h3 className="text-[17px] font-semibold leading-none text-[#171717]">{section.title}</h3>
                    {bullets.length > 0 ? (
                      <ul className="mt-3 space-y-2">
                        {bullets.map((b, bi) => (
                          <li key={bi} className="flex items-start gap-2 text-[14px] font-medium leading-[1.7] text-[#737373]">
                            <span className="mt-[10px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#7B76DF]" />
                            {b}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-3 whitespace-pre-wrap text-[14px] font-medium leading-[1.7] text-[#737373]">
                        {section.body || "No content available yet."}
                      </p>
                    )}
                  </WhiteCard>
                );
              }

              return (
                <WhiteCard key={`${section.title}-${index}`} className="p-5">
                  <h3 className="text-[17px] font-semibold leading-none text-[#171717]">{section.title}</h3>
                  <p className="mt-3 whitespace-pre-wrap text-[14px] font-medium leading-[1.7] text-[#737373]">
                    {section.body || "No content available yet."}
                  </p>
                </WhiteCard>
              );
            })}
          </div>
        )}

        <div className="mt-8 flex flex-wrap items-center justify-end gap-3">
          <SecondaryButton onClick={() => void sendToNotion()}>
            <ArrowClockwise size={14} />
            Send to Notion
          </SecondaryButton>
          <PrimaryButton onClick={() => window.location.assign(`/project/${projectId}?tab=strategy`)}>
            Continue to Strategy
            <ArrowRight size={14} />
          </PrimaryButton>
        </div>
      </ModulePanel>
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
  ].join(" - ");
}

type CompetitorCardData = {
  name: string;
  domain: string;
  tagline: string;
  strengths: string[];
  weaknesses: string[];
};

function parseCompetitorCards(body: string): CompetitorCardData[] {
  const blocks = body.split(/(?=^#{2,4}\s+)/m).filter((b) => b.trim());
  if (blocks.length === 0) {
    return [];
  }

  // If no sub-headings found, try splitting by bold markers
  if (blocks.length === 1 && !body.match(/^#{2,4}\s+/m)) {
    const boldBlocks = body.split(/(?=^\*\*[^*]+\*\*\s*$)/m).filter((b) => b.trim());
    if (boldBlocks.length <= 1) {
      return [];
    }
    return boldBlocks.map(parseOneCompetitor).filter((c): c is CompetitorCardData => c !== null);
  }

  return blocks.map(parseOneCompetitor).filter((c): c is CompetitorCardData => c !== null);
}

function parseOneCompetitor(block: string): CompetitorCardData | null {
  const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) {
    return null;
  }

  const name = (lines[0] ?? "").replace(/^#{2,4}\s+/, "").replace(/\*\*/g, "").trim();
  if (!name) {
    return null;
  }

  let domain = "";
  let tagline = "";
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  let currentList: "strengths" | "weaknesses" | null = null;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const lower = line.toLowerCase();

    if (lower.includes("strength")) {
      currentList = "strengths";
      continue;
    }
    if (lower.includes("weakness")) {
      currentList = "weaknesses";
      continue;
    }

    if (line.startsWith("- ") || line.startsWith("• ") || line.startsWith("* ")) {
      const point = line.replace(/^[-•*]\s*/, "");
      if (currentList === "strengths") {
        strengths.push(point);
      } else if (currentList === "weaknesses") {
        weaknesses.push(point);
      }
      continue;
    }

    if (!currentList && !domain && (line.match(/^https?:\/\//) || line.match(/^www\./) || line.match(/^\S+\.[a-z]{2,4}$/i))) {
      domain = line;
      continue;
    }

    if (!currentList && !tagline && domain) {
      tagline = line.replace(/^[>-]\s*/, "");
    } else if (!currentList && !tagline && !domain) {
      tagline = line.replace(/^[>-]\s*/, "");
    }
  }

  return { name, domain, tagline, strengths, weaknesses };
}

function parseBulletPoints(body: string): string[] {
  return body
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- ") || line.startsWith("• ") || line.startsWith("* "))
    .map((line) => line.replace(/^[-•*]\s*/, ""));
}
