import { useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/lib/convex";
import type { Id } from "../../../convex/_generated/dataModel";
import type { ProjectAiArtifact, ProjectAiRun } from "@/types/ai";

type GenerateTabProps = {
  projectId: Id<"projects">;
  projectName: string;
};

export function GenerateTab({ projectId, projectName }: GenerateTabProps) {
  const artifacts = useQuery(api.projectAi.listArtifacts, { projectId, module: "generate" });
  const runs = useQuery(api.projectAi.listRuns, { projectId, module: "generate" });
  const createRun = useMutation(api.projectAi.createRun);
  const requestArtifactDestination = useMutation(api.projectAi.requestArtifactDestination);
  const artifactList: ProjectAiArtifact[] = artifacts ?? [];
  const runList: ProjectAiRun[] = runs ?? [];
  const latestRun = runList[0] ?? null;
  const completedCount = artifactList.filter((artifact) => artifact.status !== "failed").length;

  const latestDestinationByArtifact = useMemo(() => {
    const map = new Map<string, { figma?: string; notion?: string }>();
    for (const artifact of artifactList) {
      const latestFigma = artifact.destinations.find((destination) => destination.provider === "figma");
      const latestNotion = artifact.destinations.find((destination) => destination.provider === "notion");
      map.set(artifact.id, {
        figma: latestFigma?.status,
        notion: latestNotion?.status,
      });
    }
    return map;
  }, [artifactList]);

  async function launchGenerateRun() {
    const result = await createRun({
      projectId,
      module: "generate",
      title: `${projectName} generate run`,
      inputSummary: `Existing generated outputs: ${artifactList.length}`,
    });
    window.location.assign(`/agents/claude?source=settings&projectId=${projectId}&module=generate&runId=${result.runId}`);
  }

  async function handleDestination(
    artifactId: string,
    provider: "figma" | "notion",
    action: string,
  ) {
    await requestArtifactDestination({
      artifactId: artifactId as Id<"projectAiArtifacts">,
      provider,
      action,
    });
    window.location.assign(
      `/agents/claude?source=settings&projectId=${projectId}&artifactId=${artifactId}&provider=${provider}&action=${encodeURIComponent(action)}`,
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 rounded-full bg-[#EDFCF2] px-3 py-1 text-[13px] font-medium text-[#22C55E]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#22C55E]" />
          {latestRun?.status === "running" ? "Generating" : completedCount > 0 ? "Generated" : "Ready"}
        </span>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-[10px] border border-border px-4 py-2 text-[13px] font-medium text-text-primary transition-colors hover:bg-bg-subtle"
          onClick={() => void launchGenerateRun()}
        >
          <span>{latestRun?.status === "running" ? "Open" : "Generate via"}</span>
          <img src="/claude-full.svg" alt="Claude" className="h-[15px]" />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {artifactList.length > 0 ? (
          artifactList.map((artifact) => (
            <div
              key={artifact.id}
              className="overflow-hidden rounded-[12px] border border-border-subtle bg-white"
            >
              <div className="flex aspect-[16/10] items-center justify-center bg-bg-subtle px-6 text-center">
                <div>
                  <div className="text-[15px] font-medium text-text-primary">{artifact.title}</div>
                  <div className="mt-2 text-[13px] text-text-secondary">
                    {artifact.summary || artifact.kind}
                  </div>
                </div>
              </div>

              <div className="p-4">
                <h3 className="font-heading text-[15px] font-semibold text-text-primary">
                  {artifact.title}
                </h3>
                <p className="mt-1 text-[13px] text-text-secondary">
                  {artifact.summary || "Generated output stored in Stage."}
                </p>
                <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-text-secondary">
                  <span className="rounded-full bg-bg-subtle px-2 py-1">
                    Figma: {latestDestinationByArtifact.get(artifact.id)?.figma ?? "Not sent"}
                  </span>
                  <span className="rounded-full bg-bg-subtle px-2 py-1">
                    Notion: {latestDestinationByArtifact.get(artifact.id)?.notion ?? "Not sent"}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className="rounded-[7px] border border-accent bg-accent/5 px-3 py-1.5 text-[12px] font-medium text-accent transition-colors hover:bg-accent/10"
                    onClick={() => void handleDestination(artifact.id, "figma", "open_in_figma")}
                  >
                    Open in Figma via Claude
                  </button>
                  <button
                    type="button"
                    className="rounded-[7px] border border-border px-3 py-1.5 text-[12px] font-medium text-text-primary transition-colors hover:bg-bg-subtle"
                    disabled={!artifact.externalUrl}
                    onClick={() => {
                      if (artifact.externalUrl) {
                        window.open(artifact.externalUrl, "_blank", "noopener,noreferrer");
                      }
                    }}
                  >
                    Preview
                  </button>
                  <button
                    type="button"
                    className="rounded-[7px] border border-border px-3 py-1.5 text-[12px] font-medium text-text-primary transition-colors hover:bg-bg-subtle"
                    onClick={() => void handleDestination(artifact.id, "figma", "iterate_design")}
                  >
                    Iterate with Claude
                  </button>
                  <button
                    type="button"
                    className="rounded-[7px] border border-border px-3 py-1.5 text-[12px] font-medium text-text-primary transition-colors hover:bg-bg-subtle"
                    onClick={() => void handleDestination(artifact.id, "notion", "export_to_notion")}
                  >
                    Add to Notion via Claude
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full rounded-[16px] border border-dashed border-border-subtle bg-white p-6 text-[14px] leading-[1.7] text-text-secondary">
            No generated outputs yet. Launch Claude to create the first wireframes or structured deliverables.
          </div>
        )}
      </div>

      <div className="flex flex-col items-start justify-between gap-4 rounded-[12px] bg-accent p-6 sm:flex-row sm:items-center">
        <div>
          <p className="text-[15px] font-semibold text-white">
            {completedCount} outputs available
          </p>
          <p className="mt-1 text-[13px] text-white/70">
            Share with your client, push to Notion or Figma through Claude, or save the result into your delivery workflow.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-[10px] border border-white/30 px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-white/10"
            onClick={() => void navigator.clipboard.writeText(window.location.href)}
          >
            Share
          </button>
          <button
            type="button"
            className="rounded-[10px] border border-white/30 px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-white/10"
            onClick={() => void launchGenerateRun()}
          >
            Export
          </button>
          <button
            type="button"
            className="rounded-[10px] bg-white px-4 py-2 text-[13px] font-medium text-accent transition-colors hover:bg-white/90"
            onClick={() => void window.location.assign(`/project/${projectId}?tab=assets`)}
          >
            Save to Assets
          </button>
        </div>
      </div>
    </div>
  );
}
