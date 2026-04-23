import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Plus } from "@phosphor-icons/react";
import { api } from "@/lib/convex";
import type { Id } from "../../../convex/_generated/dataModel";
import type { ProjectAiArtifact, ProjectAiRun } from "@/types/ai";

type MoodboardTabProps = {
  projectId: Id<"projects">;
  projectName: string;
};

export function MoodboardTab({ projectId, projectName }: MoodboardTabProps) {
  const artifacts = useQuery(api.projectAi.listArtifacts, { projectId, module: "moodboard" });
  const runs = useQuery(api.projectAi.listRuns, { projectId, module: "moodboard" });
  const createRun = useMutation(api.projectAi.createRun);

  const [clientWebsite, setClientWebsite] = useState("");
  const [competitorUrls, setCompetitorUrls] = useState<string[]>([""]);
  const [referenceUrls, setReferenceUrls] = useState<string[]>([""]);
  const [notes, setNotes] = useState("");
  const [brief, setBrief] = useState("");
  const [isLaunching, setIsLaunching] = useState(false);

  const artifactList: ProjectAiArtifact[] = artifacts ?? [];
  const runList: ProjectAiRun[] = runs ?? [];
  const hasArtifact = artifactList.length > 0;
  const latestArtifact = artifactList[0] ?? null;

  async function launchMoodboardRun() {
    setIsLaunching(true);
    try {
      const result = await createRun({
        projectId,
        module: "moodboard",
        title: `${projectName} moodboard run`,
        inputSummary: `Website: ${clientWebsite || "n/a"} · Competitors: ${competitorUrls.filter(Boolean).length}`,
      });
      window.location.assign(`/agents/claude?source=settings&projectId=${projectId}&module=moodboard&runId=${result.runId}`);
    } catch {
      // Error handling
    } finally {
      setIsLaunching(false);
    }
  }

  function handleListChange(values: string[], index: number, value: string, setter: (v: string[]) => void) {
    const next = [...values];
    next[index] = value;
    if (index === next.length - 1 && value.trim() !== "") next.push("");
    setter(next);
  }

  if (!hasArtifact) {
    return (
      <div className="pb-20">
        <div className="mx-auto max-w-[940px] pt-4">
          <div className="mb-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#D97757]/15 bg-[#FFF5F0] px-3 py-1.5 text-[12px] font-medium text-[#D97757]">
              <img src="/logos/integrations/claude.svg" alt="" className="h-3.5 w-3.5" />
              First run starts with Claude
            </div>
            <h2 className="mt-5 font-heading text-[34px] font-semibold tracking-[-0.04em] text-text-primary">
              Configure Moodboard
            </h2>
            <p className="mt-2 max-w-[760px] text-[16px] leading-[1.75] text-text-secondary">
              Provide context about the client and their market. The more you give, the better the first Claude moodboard run will be.
            </p>
          </div>

          <div className="space-y-7 rounded-[24px] border border-border-subtle bg-white p-6 shadow-[0_12px_40px_rgba(17,24,39,0.04)] sm:p-8">
            <ContextInput label="Client Website" value={clientWebsite} onChange={setClientWebsite} placeholder="ex. www.google.com" />

            <div>
              <label className="mb-3 block text-[15px] font-medium text-text-primary">Specific Competitors to include</label>
              <div className="space-y-3">
                {competitorUrls.map((value, index) => (
                  <ContextInput key={`comp-${index}`} value={value} onChange={(v) => handleListChange(competitorUrls, index, v, setCompetitorUrls)} placeholder="ex. www.google.com" />
                ))}
              </div>
              <button type="button" onClick={() => setCompetitorUrls([...competitorUrls, ""])} className="mt-3 inline-flex items-center gap-2 rounded-[8px] bg-text-primary px-3.5 py-2 text-[13px] font-medium text-white transition-colors hover:opacity-90">
                <Plus size={14} weight="bold" />
                Add
              </button>
            </div>

            <ContextInput label="Reference links" value={referenceUrls[0] ?? ""} onChange={(v) => handleListChange(referenceUrls, 0, v, setReferenceUrls)} placeholder="ex. www.google.com" />

            <ContextTextarea label="Additional notes" value={notes} onChange={setNotes} placeholder="https://Baseframe.com" />

            <ContextTextarea label="Project Brief or Context" value={brief} onChange={setBrief} placeholder="Type here..." minHeight="min-h-[160px]" />

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="button"
                disabled={isLaunching}
                onClick={() => void launchMoodboardRun()}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-[12px] bg-accent px-6 text-[15px] font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
              >
                <img src="/logos/integrations/claude.svg" alt="" className="h-4 w-4" />
                {isLaunching ? "Launching..." : "Run Research"}
              </button>
              <button type="button" className="inline-flex h-12 items-center justify-center rounded-[12px] border border-border bg-white px-6 text-[15px] font-medium text-text-primary transition-colors hover:bg-bg-subtle">
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-20">
      <div className="mx-auto max-w-[940px] py-6">
        <div className="rounded-[16px] border border-border-subtle bg-white p-5">
          <div className="font-heading text-[18px] font-semibold text-text-primary">Latest moodboard</div>
          <div className="mt-1 text-[13px] text-text-secondary">
            Updated {latestArtifact ? new Date(latestArtifact.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Never"}
          </div>
          <div className="mt-5 whitespace-pre-wrap text-[14px] leading-[1.75] text-text-secondary">
            {latestArtifact?.contentMarkdown || latestArtifact?.summary || "No content yet."}
          </div>
        </div>

        {runList.length > 0 ? (
          <div className="mt-6 rounded-[16px] border border-border-subtle bg-white p-5">
            <div className="font-heading text-[18px] font-semibold text-text-primary">Run history</div>
            <div className="mt-4 space-y-3">
              {runList.map((run) => (
                <div key={run.id} className="flex items-center justify-between gap-3 rounded-[12px] border border-border-subtle px-4 py-3">
                  <div>
                    <div className="text-[14px] font-medium text-text-primary">{run.title}</div>
                    <div className="mt-1 text-[12px] text-text-secondary">
                      {run.startedAt ? new Date(run.startedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Pending"}
                    </div>
                  </div>
                  <span className="rounded-full bg-bg-subtle px-2.5 py-1 text-[12px] font-medium text-text-secondary">{run.status}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ContextInput({ label, value, onChange, placeholder }: { label?: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div>
      {label ? <label className="mb-3 block text-[15px] font-medium text-text-primary">{label}</label> : null}
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-14 w-full rounded-[14px] border border-border bg-white px-5 text-[15px] text-text-primary outline-none transition-colors duration-150 placeholder:text-text-tertiary focus:border-accent" />
    </div>
  );
}

function ContextTextarea({ label, value, onChange, placeholder, minHeight = "min-h-[110px]" }: { label: string; value: string; onChange: (v: string) => void; placeholder: string; minHeight?: string }) {
  return (
    <div>
      <label className="mb-3 block text-[15px] font-medium text-text-primary">{label}</label>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={`${minHeight} w-full rounded-[14px] border border-border bg-white px-5 py-4 text-[15px] text-text-primary outline-none transition-colors duration-150 placeholder:text-text-tertiary focus:border-accent`} />
    </div>
  );
}
