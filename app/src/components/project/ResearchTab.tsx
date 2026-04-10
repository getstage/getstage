import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery } from "convex/react";
import { ArrowClockwise, ShareNetwork } from "@phosphor-icons/react";
import { api } from "@/lib/convex";
import type { Id } from "../../../convex/_generated/dataModel";
import type { ProjectAiArtifact, ProjectAiRun } from "@/types/ai";

type ResearchTabProps = {
  projectId: Id<"projects">;
  projectName: string;
};

export function ResearchTab({ projectId, projectName }: ResearchTabProps) {
  const context = useQuery(api.projectAi.getContext, { projectId });
  const runs = useQuery(api.projectAi.listRuns, { projectId, module: "research" });
  const artifacts = useQuery(api.projectAi.listArtifacts, { projectId, module: "research" });
  const upsertContext = useMutation(api.projectAi.upsertContext);
  const createRun = useMutation(api.projectAi.createRun);

  const [clientWebsite, setClientWebsite] = useState("");
  const [competitorsText, setCompetitorsText] = useState("");
  const [referencesText, setReferencesText] = useState("");
  const [brief, setBrief] = useState("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  const runList: ProjectAiRun[] = runs ?? [];
  const artifactList: ProjectAiArtifact[] = artifacts ?? [];
  const latestArtifact = artifactList[0] ?? null;
  const latestRun = runList[0] ?? null;

  useEffect(() => {
    if (!context) {
      return;
    }
    setClientWebsite(context.clientWebsite);
    setCompetitorsText(context.competitorUrls.join("\n"));
    setReferencesText(context.referenceUrls.join("\n"));
    setBrief(context.brief);
    setNotes(context.notes);
  }, [context]);

  const runStatus = useMemo(() => {
    if (latestRun?.status === "running") {
      return "Running";
    }
    if (latestArtifact) {
      return "Complete";
    }
    return "Draft";
  }, [latestArtifact, latestRun?.status]);

  async function persistContext() {
    setIsSaving(true);
    try {
      await upsertContext({
        projectId,
        clientWebsite,
        competitorUrls: splitLines(competitorsText),
        referenceUrls: splitLines(referencesText),
        brief,
        notes,
      });
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
        inputSummary: `Website: ${clientWebsite || "n/a"} · Competitors: ${splitLines(competitorsText).length}`,
      });
      const nextUrl = `/agents/claude?source=settings&projectId=${projectId}&module=research&runId=${result.runId}`;
      window.location.assign(nextUrl);
    } finally {
      setIsLaunching(false);
    }
  }

  return (
    <div className="pb-20">
      <div className="flex flex-wrap items-center gap-2.5 py-6">
        <StatusBadge label={runStatus} />
        <div className="flex-1" />
        <button
          type="button"
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-[8px] border border-border bg-transparent px-3.5 py-2 text-[13px] font-medium text-text-secondary transition-all duration-150 hover:border-text-secondary hover:text-text-primary"
          onClick={() => void launchResearchRun()}
          disabled={isLaunching}
        >
          <ArrowClockwise size={14} />
          {isLaunching ? "Launching..." : latestArtifact ? "Regenerate" : "Run in Claude"}
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

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <section className="space-y-4 rounded-[16px] border border-border-subtle bg-white p-5">
          <h2 className="font-heading text-[18px] font-semibold text-text-primary">Research inputs</h2>
          <Field label="Client website">
              <input
                type="url"
                value={clientWebsite}
                onChange={(event) => setClientWebsite(event.target.value)}
                placeholder="https://client.com"
                className="w-full rounded-[10px] border border-transparent bg-input-bg px-4 py-3 text-[14px] text-text-primary outline-none transition-all duration-200 placeholder:text-text-tertiary focus:border-border focus:bg-white"
              />
          </Field>
          <Field label="Competitors">
            <textarea
              value={competitorsText}
              onChange={(event) => setCompetitorsText(event.target.value)}
              placeholder="One URL per line"
              className="min-h-[110px] w-full rounded-[10px] border border-transparent bg-input-bg px-4 py-3 text-[14px] text-text-primary outline-none transition-all duration-200 placeholder:text-text-tertiary focus:border-border focus:bg-white"
            />
          </Field>
          <Field label="References">
            <textarea
              value={referencesText}
              onChange={(event) => setReferencesText(event.target.value)}
              placeholder="One URL per line"
              className="min-h-[110px] w-full rounded-[10px] border border-transparent bg-input-bg px-4 py-3 text-[14px] text-text-primary outline-none transition-all duration-200 placeholder:text-text-tertiary focus:border-border focus:bg-white"
            />
          </Field>
          <Field label="Brief">
            <textarea
              value={brief}
              onChange={(event) => setBrief(event.target.value)}
              placeholder="What should Claude focus on?"
              className="min-h-[110px] w-full rounded-[10px] border border-transparent bg-input-bg px-4 py-3 text-[14px] text-text-primary outline-none transition-all duration-200 placeholder:text-text-tertiary focus:border-border focus:bg-white"
            />
          </Field>
          <Field label="Notes">
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Extra context for the research run"
              className="min-h-[110px] w-full rounded-[10px] border border-transparent bg-input-bg px-4 py-3 text-[14px] text-text-primary outline-none transition-all duration-200 placeholder:text-text-tertiary focus:border-border focus:bg-white"
            />
          </Field>
          <button
            type="button"
            className="inline-flex w-full items-center justify-center rounded-[10px] bg-accent px-4 py-3 text-[14px] font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSaving}
            onClick={() => void persistContext()}
          >
            {isSaving ? "Saving..." : "Save inputs"}
          </button>
        </section>

        <section className="space-y-6">
          <div className="rounded-[16px] border border-border-subtle bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-heading text-[18px] font-semibold text-text-primary">
                  Latest research
                </div>
                <div className="mt-1 text-[13px] text-text-secondary">
                  {latestArtifact
                    ? `Updated ${formatTimestamp(latestArtifact.updatedAt)}`
                    : "No research artifact stored yet."}
                </div>
              </div>
              {latestRun ? (
                <span className="rounded-full bg-bg-subtle px-3 py-1 text-[12px] font-medium text-text-secondary">
                  {latestRun.status}
                </span>
              ) : null}
            </div>

            {latestArtifact ? (
              <div className="mt-5 whitespace-pre-wrap text-[14px] leading-[1.75] text-text-secondary">
                {latestArtifact.contentMarkdown ||
                  latestArtifact.summary ||
                  latestArtifact.contentJson ||
                  "This artifact has no display content yet."}
              </div>
            ) : (
              <div className="mt-5 rounded-[12px] border border-dashed border-border-subtle bg-bg-subtle px-4 py-5 text-[14px] text-text-secondary">
                Run Claude from this tab to create the first research artifact for this project.
              </div>
            )}
          </div>

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
                      {run.status}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-[14px] text-text-secondary">No runs yet.</div>
              )}
            </div>
          </div>
        </section>
      </div>
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

function StatusBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-[#EDFCF2] px-2.5 py-0.5 text-[12px] font-medium text-[#22C55E]">
      {label}
    </span>
  );
}

function splitLines(value: string) {
  return value
    .split("\n")
    .map((entry) => entry.trim())
    .filter(Boolean);
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
